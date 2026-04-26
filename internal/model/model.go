package model

type License struct {
	ID           int64  `gorm:"primaryKey;autoIncrement"`
	LicenseKey   string `gorm:"column:license_key;type:varchar(64);not null;uniqueIndex"`
	Domain       string `gorm:"column:domain;type:varchar(255);not null"`
	ExpireTime   int64  `gorm:"column:expire_time;not null"`
	Status       int    `gorm:"column:status;not null;default:1"`
	CreatedTime  int64  `gorm:"column:created_time;not null"`
	UpdatedTime  int64  `gorm:"column:updated_time;not null"`
}

func (License) TableName() string { return "license" }

type AdminUser struct {
	ID          int64  `gorm:"primaryKey;autoIncrement"`
	Username    string `gorm:"column:username;type:varchar(100);not null;uniqueIndex"`
	Password    string `gorm:"column:password;type:varchar(64);not null"`
	CreatedTime int64  `gorm:"column:created_time;not null"`
}

func (AdminUser) TableName() string { return "admin_user" }

type VerifyRequest struct {
	LicenseKey string `json:"license_key"`
	Domain     string `json:"domain"`
}

type VerifyResponse struct {
	Valid       bool   `json:"valid"`
	ExpireTime  int64  `json:"expire_time,omitempty"`
	Username    string `json:"username,omitempty"`
	Reason      string `json:"reason,omitempty"`
}

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Token    string `json:"token"`
	Username string `json:"username"`
}

type LicenseListRequest struct {
	Keyword string `json:"keyword"`
}

type LicenseCreateRequest struct {
	Domain     string `json:"domain"`
	ExpireTime int64  `json:"expire_time"`
}

type LicenseUpdateRequest struct {
	ID         int64  `json:"id"`
	Domain     string `json:"domain"`
	ExpireTime int64  `json:"expire_time"`
	Status     int    `json:"status"`
}

type LicenseDeleteRequest struct {
	ID int64 `json:"id"`
}
