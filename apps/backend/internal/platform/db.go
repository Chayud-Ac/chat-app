package platform

import (
	"context"
	"fmt"
	"net"
	"net/url"
)

// DB holds the parsed Postgres address for health probing.
type DB struct {
	host string // host:port
}

func NewDB(databaseURL string) (*DB, error) {
	host, err := pgHost(databaseURL)
	if err != nil {
		return nil, err
	}
	return &DB{host: host}, nil
}

// Ping sends a Postgres SSLRequest probe over raw TCP.
// Any valid byte from the server (N/S/E) means Postgres is alive.
func (d *DB) Ping(ctx context.Context) error {
	var nd net.Dialer
	conn, err := nd.DialContext(ctx, "tcp", d.host)
	if err != nil {
		return fmt.Errorf("connect postgres: %w", err)
	}
	defer func() { _ = conn.Close() }()

	// SSLRequest message: length=8, code=80877103 (0x04D2162F)
	if _, err := conn.Write([]byte{0, 0, 0, 8, 4, 210, 22, 47}); err != nil {
		return fmt.Errorf("write probe: %w", err)
	}
	buf := make([]byte, 1)
	if _, err := conn.Read(buf); err != nil {
		return fmt.Errorf("read response: %w", err)
	}
	return nil
}

func pgHost(databaseURL string) (string, error) {
	u, err := url.Parse(databaseURL)
	if err != nil {
		return "", fmt.Errorf("parse DATABASE_URL: %w", err)
	}
	host := u.Hostname()
	port := u.Port()
	if port == "" {
		port = "5432"
	}
	return net.JoinHostPort(host, port), nil
}
