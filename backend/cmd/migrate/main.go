package main

import (
	"fmt"
	"os"

	"github.com/ymmtyamaterous/event-manager-for-music-api/internal/config"
	"github.com/ymmtyamaterous/event-manager-for-music-api/internal/migrate"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "usage: go run ./cmd/migrate [up|down|seed|unseed]")
		os.Exit(1)
	}

	direction := os.Args[1]
	cfg := config.Load()

	if err := migrate.Run(direction, cfg.DatabaseURL); err != nil {
		fmt.Fprintln(os.Stderr, err.Error())
		os.Exit(1)
	}

	fmt.Printf("migration %s completed\n", direction)
}
