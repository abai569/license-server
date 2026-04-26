package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"license-server/internal/model"
	"license-server/internal/repo"
	"license-server/internal/util"
)

type Handler struct {
	repo      *repo.Repository
	jwtSecret string
}

func NewHandler(r *repo.Repository, jwtSecret string) *Handler {
	return &Handler{
		repo:      r,
		jwtSecret: jwtSecret,
	}
}

func (h *Handler) Register(mux *http.ServeMux) {
	// 验证端 API（公开）
	mux.HandleFunc("/api/verify", h.verify)
	mux.HandleFunc("/api/info", h.info)

	// 管理端 API（需要 JWT 鉴权）
	mux.HandleFunc("/api/admin/login", h.adminLogin)
	mux.HandleFunc("/api/admin/license/list", h.authMiddleware(h.licenseList))
	mux.HandleFunc("/api/admin/license/create", h.authMiddleware(h.licenseCreate))
	mux.HandleFunc("/api/admin/license/update", h.authMiddleware(h.licenseUpdate))
	mux.HandleFunc("/api/admin/license/delete", h.authMiddleware(h.licenseDelete))
	mux.HandleFunc("/api/admin/change_password", h.authMiddleware(h.changePassword))
}

func (h *Handler) verify(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "method not allowed"})
		return
	}

	var req model.VerifyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	resp, err := h.repo.VerifyLicense(req.LicenseKey, req.Domain)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, resp)
}

func (h *Handler) info(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "method not allowed"})
		return
	}

	var req struct {
		LicenseKey string `json:"license_key"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	license, err := h.repo.GetLicenseByKey(req.LicenseKey)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	if license == nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "license not found"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"license_key": license.LicenseKey,
		"domain":      license.Domain,
		"expire_time": license.ExpireTime,
		"status":      license.Status,
	})
}

func (h *Handler) adminLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "method not allowed"})
		return
	}

	var req model.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	admin, err := h.repo.GetAdminByUsername(req.Username)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	if admin == nil || admin.Password != util.MD5(req.Password) {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid credentials"})
		return
	}

	token, err := util.GenerateToken(admin.ID, admin.Username, h.jwtSecret)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to generate token"})
		return
	}

	writeJSON(w, http.StatusOK, model.LoginResponse{
		Token:    token,
		Username: admin.Username,
	})
}

func (h *Handler) licenseList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "method not allowed"})
		return
	}

	var req model.LicenseListRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	licenses, err := h.repo.ListLicenses(req.Keyword)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"list": licenses,
	})
}

func (h *Handler) licenseCreate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "method not allowed"})
		return
	}

	var req model.LicenseCreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	license, err := h.repo.CreateLicense(req.Domain, req.Remark, req.ExpireTime)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, license)
}

func (h *Handler) licenseUpdate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "method not allowed"})
		return
	}

	var req model.LicenseUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	if err := h.repo.UpdateLicense(req.ID, req.Domain, req.Remark, req.ExpireTime, req.Status); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "updated"})
}

func (h *Handler) licenseDelete(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "method not allowed"})
		return
	}

	var req model.LicenseDeleteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	if err := h.repo.DeleteLicense(req.ID); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "deleted"})
}

func (h *Handler) changePassword(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "method not allowed"})
		return
	}

	adminID := r.Header.Get("X-Admin-ID")
	if adminID == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	var req struct {
		OldPassword string `json:"old_password"`
		NewPassword string `json:"new_password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	if req.OldPassword == "" || req.NewPassword == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "密码不能为空"})
		return
	}

	if len(req.NewPassword) < 6 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "新密码长度不能少于 6 位"})
		return
	}

	adminIDInt, err := strconv.ParseInt(adminID, 10, 64)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "invalid admin id"})
		return
	}

	admin, err := h.repo.GetAdminByID(adminIDInt)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	if admin == nil || admin.Password != util.MD5(req.OldPassword) {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "原密码错误"})
		return
	}

	newPasswordHash := util.MD5(req.NewPassword)
	if err := h.repo.UpdateAdminPassword(adminIDInt, newPasswordHash); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "密码修改成功"})
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}
