package platform

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net"
)

// Redis holds the address for health probing.
type Redis struct {
	addr string
}

func NewRedis(addr string) *Redis {
	return &Redis{addr: addr}
}

// Ping sends a Redis inline PING command and verifies the +PONG reply.
func (r *Redis) Ping(ctx context.Context) error {
	var d net.Dialer
	conn, err := d.DialContext(ctx, "tcp", r.addr)
	if err != nil {
		return fmt.Errorf("connect redis: %w", err)
	}
	defer func() { _ = conn.Close() }()

	if _, err := fmt.Fprint(conn, "PING\r\n"); err != nil {
		return fmt.Errorf("write ping: %w", err)
	}

	buf := make([]byte, 7)
	if _, err := io.ReadFull(conn, buf); err != nil {
		return fmt.Errorf("read pong: %w", err)
	}
	if !bytes.Equal(buf, []byte("+PONG\r\n")) {
		return fmt.Errorf("unexpected response: %q", buf)
	}
	return nil
}
