package response

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type Body struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Data    any    `json:"data,omitempty"`
}

func OK(c *gin.Context, data any) {
	c.JSON(http.StatusOK, Body{Code: 0, Message: "ok", Data: data})
}

func OKMessage(c *gin.Context, message string, data any) {
	c.JSON(http.StatusOK, Body{Code: 0, Message: message, Data: data})
}

func Err(c *gin.Context, status int, code int, message string) {
	c.JSON(status, Body{Code: code, Message: message})
}

func ErrBadRequest(c *gin.Context, message string) {
	Err(c, http.StatusBadRequest, 400, message)
}

func ErrUnauthorized(c *gin.Context, message string) {
	Err(c, http.StatusUnauthorized, 401, message)
}

func ErrForbidden(c *gin.Context, message string) {
	Err(c, http.StatusForbidden, 403, message)
}

func ErrNotFound(c *gin.Context, message string) {
	Err(c, http.StatusNotFound, 404, message)
}

func ErrInternal(c *gin.Context, message string) {
	Err(c, http.StatusInternalServerError, 500, message)
}
