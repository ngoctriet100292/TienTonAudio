package repository

import (
	"context"
	"fmt"

	"github.com/IREAKING/tientonaudio/backend/internal/domain"
	"github.com/jackc/pgx/v5"
)

type RealmQuerier interface {
	Query(context.Context, string, ...any) (pgx.Rows, error)
}

// LoadCultivationRealms derives the upper bound from the next database row.
func LoadCultivationRealms(ctx context.Context, q RealmQuerier) ([]domain.CultivationRealmInfo, error) {
	rows, err := q.Query(ctx, `SELECT level, name, tier, tier_name, min_exp,
		COALESCE(LEAD(min_exp) OVER (ORDER BY level), -1), description, ability, privilege, color
		FROM cultivation_realms ORDER BY level`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var realms []domain.CultivationRealmInfo
	for rows.Next() {
		var r domain.CultivationRealmInfo
		if err := rows.Scan(&r.Level, &r.Name, &r.Tier, &r.TierName, &r.MinExp, &r.MaxExp, &r.Description, &r.Ability, &r.Privilege, &r.Color); err != nil {
			return nil, err
		}
		realms = append(realms, r)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if err := domain.ValidateCultivationRealms(realms); err != nil {
		return nil, fmt.Errorf("invalid database catalogue: %w", err)
	}
	return realms, nil
}

func RefreshCultivationRealms(ctx context.Context, q RealmQuerier) error {
	realms, err := LoadCultivationRealms(ctx, q)
	if err != nil {
		return err
	}
	return domain.SetCultivationRealms(realms)
}
