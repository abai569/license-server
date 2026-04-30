package repo

import (
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"license-server/internal/model"
	"license-server/internal/util"

	"github.com/glebarez/sqlite"
)

type Repository struct {
	db *gorm.DB
}

func Open(dbPath string) (*Repository, error) {
	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	if err := db.AutoMigrate(&model.License{}, &model.AdminUser{}, &model.LicenseIPLog{}); err != nil {
		return nil, err
	}

	// 手动添加新字段（如果不存在）
	m := db.Migrator()
	if m.HasTable(&model.License{}) {
		if !m.HasColumn(&model.License{}, "Remark") {
			if err := m.AddColumn(&model.License{}, "Remark"); err != nil {
				return nil, err
			}
		}
		if !m.HasColumn(&model.License{}, "LastVerifiedAt") {
			if err := m.AddColumn(&model.License{}, "LastVerifiedAt"); err != nil {
				return nil, err
			}
		}
		if !m.HasColumn(&model.License{}, "VerifiedIP") {
			if err := m.AddColumn(&model.License{}, "VerifiedIP"); err != nil {
				return nil, err
			}
		}
	}

	return &Repository{db: db}, nil
}

func (r *Repository) Close() error {
	if r == nil || r.db == nil {
		return nil
	}
	sqlDB, err := r.db.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}

func (r *Repository) InitAdmin(username, password string) error {
	passwordHash := util.MD5(password)

	var count int64
	if err := r.db.Model(&model.AdminUser{}).Where("username = ?", username).Count(&count).Error; err != nil {
		return err
	}

	if count == 0 {
		// 创建管理员
		admin := model.AdminUser{
			Username:    username,
			Password:    passwordHash,
			CreatedTime: time.Now().UnixMilli(),
		}
		return r.db.Create(&admin).Error
	} else {
		// 更新密码
		return r.db.Model(&model.AdminUser{}).Where("username = ?", username).Update("password", passwordHash).Error
	}
}

func (r *Repository) GetAdminByUsername(username string) (*model.AdminUser, error) {
	var admin model.AdminUser
	err := r.db.Where("username = ?", username).First(&admin).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &admin, nil
}

func (r *Repository) GetAdminByID(id int64) (*model.AdminUser, error) {
	var admin model.AdminUser
	err := r.db.Where("id = ?", id).First(&admin).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &admin, nil
}

func (r *Repository) UpdateAdminPassword(id int64, passwordHash string) error {
	return r.db.Model(&model.AdminUser{}).Where("id = ?", id).Update("password", passwordHash).Error
}

func (r *Repository) ListLicenses(keyword string) ([]model.License, error) {
	var licenses []model.License
	query := r.db.Order("id DESC")

	// 支持 UUID、域名、备注三字段搜索
	if keyword != "" {
		query = query.Where("domain LIKE ? OR license_key LIKE ? OR remark LIKE ?",
			"%"+keyword+"%", "%"+keyword+"%", "%"+keyword+"%")
	}

	err := query.Find(&licenses).Error
	return licenses, err
}

func (r *Repository) GetLicenseByID(id int64) (*model.License, error) {
	var license model.License
	err := r.db.Where("id = ?", id).First(&license).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &license, nil
}

func (r *Repository) GetLicenseByKey(licenseKey string) (*model.License, error) {
	var license model.License
	err := r.db.Where("license_key = ?", licenseKey).First(&license).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &license, nil
}

// 验证 UUID 格式 (简单格式检查)
func isValidUUID(s string) bool {
	_, err := uuid.Parse(s)
	return err == nil
}

func (r *Repository) CreateLicense(domain, remark string, expireTime int64, customKey string) (*model.License, error) {
	now := time.Now().UnixMilli()
	key := customKey
	if key == "" {
		key = uuid.New().String()
	} else {
		key = uuid.MustParse(key).String() // 标准化格式
	}

	license := model.License{
		LicenseKey:  key,
		Domain:      domain,
		Remark:      remark,
		ExpireTime:  expireTime,
		Status:      1,
		CreatedTime: now,
		UpdatedTime: now,
	}

	if err := r.db.Create(&license).Error; err != nil {
		return nil, err
	}
	return &license, nil
}

func (r *Repository) UpdateLicense(id int64, domain, remark string, expireTime int64, status int, newLicenseKey string) error {
	updates := map[string]interface{}{
		"domain":       domain,
		"remark":       remark,
		"expire_time":  expireTime,
		"status":       status,
		"updated_time": time.Now().UnixMilli(),
	}

	// 如果提供了新的 LicenseKey 且不为空，则更新 UUID
	if newLicenseKey != "" {
		existing, err := r.GetLicenseByKey(newLicenseKey)
		if err != nil {
			return err
		}
		// 排除自身，如果已被其他记录占用则报错
		if existing != nil && existing.ID != id {
			return fmt.Errorf("授权码已被使用")
		}
		updates["license_key"] = newLicenseKey
	}

	return r.db.Model(&model.License{}).Where("id = ?", id).Updates(updates).Error
}

// UpdateLicenseVerification 更新授权验证信息
func (r *Repository) UpdateLicenseVerification(id int64, ip string) error {
	return r.db.Model(&model.License{}).Where("id = ?", id).Updates(map[string]interface{}{
		"last_verified_at": time.Now().UnixMilli(),
		"verified_ip":      ip,
	}).Error
}

// UpdateLicenseIP 更新授权 IP 并记录变更
func (r *Repository) UpdateLicenseIP(licenseID int64, newIP, userAgent string) error {
	// 获取当前 IP
	var license model.License
	if err := r.db.First(&license, licenseID).Error; err != nil {
		return err
	}

	now := time.Now().UnixMilli()
	updates := map[string]interface{}{
		"last_verified_at": now,
		"verified_ip":      newIP,
	}

	// 如果 IP 不同，记录日志
	if license.VerifiedIP != "" && license.VerifiedIP != newIP {
		log := &model.LicenseIPLog{
			LicenseID: licenseID,
			OldIP:     license.VerifiedIP,
			NewIP:     newIP,
			ChangedAt: now,
			UserAgent: userAgent,
		}
		if err := r.db.Create(log).Error; err != nil {
			return err
		}
		updates["ip_changed_at"] = now
	}

	return r.db.Model(&model.License{}).Where("id = ?", licenseID).Updates(updates).Error
}

// GetIPLogs 获取指定授权的 IP 变更历史
func (r *Repository) GetIPLogs(licenseID int64, limit int) ([]model.LicenseIPLog, error) {
	var logs []model.LicenseIPLog
	err := r.db.Where("license_id = ?", licenseID).
		Order("changed_at DESC").
		Limit(limit).
		Find(&logs).Error
	return logs, err
}

// GetClientIP 从 HTTP 请求中提取客户端 IP
func GetClientIP(r *http.Request) string {
	// 检查 X-Forwarded-For 头（反代场景）
	xff := r.Header.Get("X-Forwarded-For")
	if xff != "" {
		ips := strings.Split(xff, ",")
		if len(ips) > 0 {
			return strings.TrimSpace(ips[0])
		}
	}

	// 检查 X-Real-IP 头
	xri := r.Header.Get("X-Real-IP")
	if xri != "" {
		return xri
	}

	// 使用 RemoteAddr
	ip := r.RemoteAddr
	if colonIndex := strings.LastIndex(ip, ":"); colonIndex != -1 {
		ip = ip[:colonIndex]
	}

	return ip
}

func (r *Repository) DeleteLicense(id int64) error {
	return r.db.Where("id = ?", id).Delete(&model.License{}).Error
}

func (r *Repository) VerifyLicense(licenseKey, domain string) (*model.VerifyResponse, error) {
	license, err := r.GetLicenseByKey(licenseKey)
	if err != nil {
		return nil, err
	}

	if license == nil {
		return &model.VerifyResponse{Valid: false, Reason: "授权码不存在"}, nil
	}

	if license.Status != 1 {
		return &model.VerifyResponse{Valid: false, Reason: "授权已被禁用"}, nil
	}

	now := time.Now().UnixMilli()
	if license.ExpireTime < now {
		return &model.VerifyResponse{Valid: false, Reason: "授权已过期"}, nil
	}

	if license.Domain != domain {
		return &model.VerifyResponse{Valid: false, Reason: "域名不匹配"}, nil
	}

	return &model.VerifyResponse{
		Valid:      true,
		ExpireTime: license.ExpireTime,
		Username:   "admin",
	}, nil
}

func (r *Repository) ExportLicenses() ([]model.License, error) {
	var licenses []model.License
	err := r.db.Order("id ASC").Find(&licenses).Error
	return licenses, err
}

type ImportResult struct {
	Success int      `json:"success"`
	Failed  int      `json:"failed"`
	Errors  []string `json:"errors,omitempty"`
}

func (r *Repository) ImportLicenses(licenses []model.License, overwrite bool) (*ImportResult, error) {
	result := &ImportResult{}

	err := r.db.Transaction(func(tx *gorm.DB) error {
		for _, lic := range licenses {
			// 基本校验
			if lic.LicenseKey == "" || lic.Domain == "" || lic.ExpireTime == 0 {
				result.Failed++
				result.Errors = append(result.Errors, "缺少必填字段: "+lic.LicenseKey)
				continue
			}

			var existing model.License
			err := tx.Where("license_key = ?", lic.LicenseKey).First(&existing).Error

			if errors.Is(err, gorm.ErrRecordNotFound) {
				// 不存在，创建
				now := time.Now().UnixMilli()
				if lic.CreatedTime == 0 {
					lic.CreatedTime = now
				}
				lic.UpdatedTime = now
				if lic.Status == 0 {
					lic.Status = 1
				}
				if err := tx.Create(&lic).Error; err != nil {
					result.Failed++
					result.Errors = append(result.Errors, "创建失败: "+err.Error())
				} else {
					result.Success++
				}
			} else if err != nil {
				result.Failed++
				result.Errors = append(result.Errors, "查询失败: "+err.Error())
			} else {
				// 已存在
				if overwrite {
					// 覆盖更新
					existing.Domain = lic.Domain
					existing.Remark = lic.Remark
					existing.ExpireTime = lic.ExpireTime
					existing.Status = lic.Status
					existing.UpdatedTime = time.Now().UnixMilli()
					if err := tx.Save(&existing).Error; err != nil {
						result.Failed++
						result.Errors = append(result.Errors, "更新失败: "+err.Error())
					} else {
						result.Success++
					}
				} else {
					// 跳过（默认行为）
					result.Failed++
					result.Errors = append(result.Errors, "已存在且未开启覆盖: "+lic.LicenseKey)
				}
			}
		}
		return nil
	})

	return result, err
}
