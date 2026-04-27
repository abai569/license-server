package repo

import (
	"errors"
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

	if err := db.AutoMigrate(&model.License{}, &model.AdminUser{}); err != nil {
		return nil, err
	}

	// 手动添加 remark 字段（如果不存在）
	m := db.Migrator()
	if m.HasTable(&model.License{}) && !m.HasColumn(&model.License{}, "Remark") {
		if err := m.AddColumn(&model.License{}, "Remark"); err != nil {
			return nil, err
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

func (r *Repository) CreateLicense(domain, remark string, expireTime int64) (*model.License, error) {
	now := time.Now().UnixMilli()
	license := model.License{
		LicenseKey:   uuid.New().String(),
		Domain:       domain,
		Remark:       remark,
		ExpireTime:   expireTime,
		Status:       1,
		CreatedTime:  now,
		UpdatedTime:  now,
	}

	if err := r.db.Create(&license).Error; err != nil {
		return nil, err
	}
	return &license, nil
}

func (r *Repository) UpdateLicense(id int64, domain, remark string, expireTime int64, status int) error {
	return r.db.Model(&model.License{}).Where("id = ?", id).Updates(map[string]interface{}{
		"domain":       domain,
		"remark":       remark,
		"expire_time":  expireTime,
		"status":       status,
		"updated_time": time.Now().UnixMilli(),
	}).Error
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
