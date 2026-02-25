package migrate

import "testing"

func TestParseVersion(t *testing.T) {
	tests := []struct {
		name      string
		fileName  string
		want      int
		wantValid bool
	}{
		{name: "valid file", fileName: "001_create_enums.sql", want: 1, wantValid: true},
		{name: "valid down file", fileName: "009_create_entries.down.sql", want: 9, wantValid: true},
		{name: "invalid format", fileName: "create_users.sql", want: 0, wantValid: false},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got, ok := parseVersion(tc.fileName)
			if ok != tc.wantValid {
				t.Fatalf("valid mismatch: got=%v want=%v", ok, tc.wantValid)
			}
			if got != tc.want {
				t.Fatalf("version mismatch: got=%d want=%d", got, tc.want)
			}
		})
	}
}
