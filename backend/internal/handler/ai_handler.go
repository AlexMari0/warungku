package handler

import (
	"net/http"
	"warungku-backend/internal/apperror"
	"warungku-backend/internal/middleware"
	"warungku-backend/internal/model"
	"warungku-backend/internal/service"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

type AIHandler struct {
	svc *service.AIService
}

func NewAIHandler(svc *service.AIService) *AIHandler {
	return &AIHandler{svc: svc}
}

func (h *AIHandler) Register(g *echo.Group) {
	g.GET("/ai/sessions", h.ListSessions)
	g.POST("/ai/sessions", h.CreateSession)
	g.DELETE("/ai/sessions/:id", h.DeleteSession)
	g.GET("/ai/sessions/:id/messages", h.GetMessages)
	g.POST("/ai/chat", h.Chat)
	g.POST("/ai/feedback", h.Feedback)
}

func (h *AIHandler) ListSessions(c echo.Context) error {
	merchantID := middleware.GetMerchantID(c)
	sessions, err := h.svc.ListSessions(c.Request().Context(), merchantID)
	if err != nil {
		return err
	}
	if sessions == nil {
		sessions = []model.AISession{}
	}
	return c.JSON(http.StatusOK, sessions)
}

func (h *AIHandler) CreateSession(c echo.Context) error {
	merchantID := middleware.GetMerchantID(c)
	var req model.CreateSessionRequest
	_ = c.Bind(&req) // optional title

	session, err := h.svc.CreateSession(c.Request().Context(), merchantID, req.Title)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, session)
}

func (h *AIHandler) DeleteSession(c echo.Context) error {
	merchantID := middleware.GetMerchantID(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return apperror.ErrValidation("ID sesi tidak valid.")
	}

	if err := h.svc.DeleteSession(c.Request().Context(), merchantID, id); err != nil {
		return err
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true})
}

func (h *AIHandler) GetMessages(c echo.Context) error {
	merchantID := middleware.GetMerchantID(c)
	sessionID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return apperror.ErrValidation("ID sesi tidak valid.")
	}

	messages, err := h.svc.GetSessionMessages(c.Request().Context(), merchantID, sessionID)
	if err != nil {
		return err
	}
	if messages == nil {
		messages = []model.AIQueryLog{}
	}
	return c.JSON(http.StatusOK, messages)
}

func (h *AIHandler) Chat(c echo.Context) error {
	merchantID := middleware.GetMerchantID(c)
	var req model.ChatRequest
	if err := c.Bind(&req); err != nil {
		return apperror.ErrValidation("Format request chat tidak valid.")
	}
	if err := c.Validate(&req); err != nil {
		return err
	}

	res, err := h.svc.Chat(c.Request().Context(), merchantID, req)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, res)
}

func (h *AIHandler) Feedback(c echo.Context) error {
	merchantID := middleware.GetMerchantID(c)
	var req model.SubmitFeedbackRequest
	if err := c.Bind(&req); err != nil {
		return apperror.ErrValidation("Format feedback tidak valid.")
	}
	if err := c.Validate(&req); err != nil {
		return err
	}

	if err := h.svc.SubmitFeedback(c.Request().Context(), merchantID, req); err != nil {
		return err
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true})
}
