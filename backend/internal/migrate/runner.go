package migrate

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

var migrationFilePattern = regexp.MustCompile(`^(\d+)_.*\.sql$`)

type migration struct {
	Name    string
	Version int
	SQL     string
}

func Run(direction string, databaseURL string) error {
	if strings.TrimSpace(databaseURL) == "" {
		return errors.New("DATABASE_URL が設定されていません")
	}

	db, err := sql.Open("pgx", databaseURL)
	if err != nil {
		return fmt.Errorf("db接続に失敗しました: %w", err)
	}
	defer db.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		return fmt.Errorf("db疎通に失敗しました: %w", err)
	}

	if err := ensureMigrationsTable(ctx, db); err != nil {
		return err
	}

	switch direction {
	case "up":
		return runUp(ctx, db)
	case "down":
		return runDown(ctx, db)
	default:
		return fmt.Errorf("不正な引数です。up か down を指定してください")
	}
}

func runUp(ctx context.Context, db *sql.DB) error {
	migrations, err := loadUpMigrations("migrations")
	if err != nil {
		return err
	}

	applied, err := getAppliedMap(ctx, db)
	if err != nil {
		return err
	}

	for _, m := range migrations {
		if applied[m.Name] {
			continue
		}

		if err := applyOne(ctx, db, m); err != nil {
			return err
		}
	}

	return nil
}

func runDown(ctx context.Context, db *sql.DB) error {
	name, version, err := latestApplied(ctx, db)
	if err != nil {
		return err
	}

	if name == "" {
		return nil
	}

	downSQL, err := loadDownSQL("migrations", name)
	if err != nil {
		return err
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("トランザクション開始に失敗しました: %w", err)
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx, downSQL); err != nil {
		return fmt.Errorf("down適用に失敗しました (%s): %w", name, err)
	}

	if _, err := tx.ExecContext(ctx, `DELETE FROM schema_migrations WHERE version = $1`, version); err != nil {
		return fmt.Errorf("schema_migrations更新に失敗しました: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("トランザクションコミットに失敗しました: %w", err)
	}

	return nil
}

func applyOne(ctx context.Context, db *sql.DB, m migration) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("トランザクション開始に失敗しました: %w", err)
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx, m.SQL); err != nil {
		return fmt.Errorf("migration適用に失敗しました (%s): %w", m.Name, err)
	}

	if _, err := tx.ExecContext(
		ctx,
		`INSERT INTO schema_migrations (version, name, applied_at) VALUES ($1, $2, NOW())`,
		m.Version,
		m.Name,
	); err != nil {
		return fmt.Errorf("schema_migrations更新に失敗しました: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("トランザクションコミットに失敗しました: %w", err)
	}

	return nil
}

func ensureMigrationsTable(ctx context.Context, db *sql.DB) error {
	_, err := db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version INTEGER PRIMARY KEY,
			name TEXT NOT NULL UNIQUE,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	if err != nil {
		return fmt.Errorf("schema_migrations作成に失敗しました: %w", err)
	}
	return nil
}

func getAppliedMap(ctx context.Context, db *sql.DB) (map[string]bool, error) {
	rows, err := db.QueryContext(ctx, `SELECT name FROM schema_migrations`)
	if err != nil {
		return nil, fmt.Errorf("schema_migrations取得に失敗しました: %w", err)
	}
	defer rows.Close()

	result := map[string]bool{}
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return nil, err
		}
		result[name] = true
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return result, nil
}

func latestApplied(ctx context.Context, db *sql.DB) (string, int, error) {
	var name string
	var version int
	err := db.QueryRowContext(
		ctx,
		`SELECT name, version FROM schema_migrations ORDER BY version DESC LIMIT 1`,
	).Scan(&name, &version)
	if errors.Is(err, sql.ErrNoRows) {
		return "", 0, nil
	}
	if err != nil {
		return "", 0, fmt.Errorf("最新migration取得に失敗しました: %w", err)
	}

	return name, version, nil
}

func loadUpMigrations(dir string) ([]migration, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, fmt.Errorf("migrationsディレクトリ読み込みに失敗しました: %w", err)
	}

	result := make([]migration, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		name := entry.Name()
		if strings.HasSuffix(name, ".down.sql") {
			continue
		}

		version, ok := parseVersion(name)
		if !ok {
			continue
		}

		bytes, err := os.ReadFile(filepath.Join(dir, name))
		if err != nil {
			return nil, fmt.Errorf("migration読込に失敗しました (%s): %w", name, err)
		}

		result = append(result, migration{
			Name:    name,
			Version: version,
			SQL:     string(bytes),
		})
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].Version < result[j].Version
	})

	return result, nil
}

func loadDownSQL(dir string, upFileName string) (string, error) {
	downFileName := strings.TrimSuffix(upFileName, ".sql") + ".down.sql"
	bytes, err := os.ReadFile(filepath.Join(dir, downFileName))
	if err != nil {
		return "", fmt.Errorf("down migrationが見つかりません (%s): %w", downFileName, err)
	}
	return string(bytes), nil
}

func parseVersion(fileName string) (int, bool) {
	matches := migrationFilePattern.FindStringSubmatch(fileName)
	if len(matches) != 2 {
		return 0, false
	}

	version, err := strconv.Atoi(matches[1])
	if err != nil {
		return 0, false
	}

	return version, true
}
