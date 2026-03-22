FROM golang:1.25-alpine AS build
# 中国大陆访问 proxy.golang.org 易超时；海外构建可：docker build --build-arg GOPROXY=https://proxy.golang.org,direct ...
ARG GOPROXY=https://goproxy.cn,direct
ARG GOSUMDB=sum.golang.google.cn
ENV GOPROXY=${GOPROXY} GOSUMDB=${GOSUMDB}
WORKDIR /src
RUN apk add --no-cache git
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /out/api ./cmd/api

FROM alpine:3.19
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=build /out/api /app/api
ENV GIN_MODE=release
EXPOSE 8080
ENTRYPOINT ["/app/api"]
