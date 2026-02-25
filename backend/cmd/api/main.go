package main

import (
	"log"

	"github.com/ymmtyamaterous/event-manager-for-music-api/internal/config"
	apihttp "github.com/ymmtyamaterous/event-manager-for-music-api/internal/http"
)

func main() {
	cfg := config.Load()

	server := apihttp.NewServer(cfg)

	log.Printf("api server listening on %s", cfg.Address())
	if err := server.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}
