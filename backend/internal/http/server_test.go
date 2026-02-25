package http

import "testing"

func TestParseRegisterUserType(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		wantErr bool
	}{
		{name: "organizer", input: "organizer", wantErr: false},
		{name: "performer", input: "performer", wantErr: false},
		{name: "audience", input: "audience", wantErr: false},
		{name: "admin not allowed", input: "admin", wantErr: true},
		{name: "empty", input: "", wantErr: true},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			_, err := parseRegisterUserType(tc.input)
			if tc.wantErr && err == nil {
				t.Fatal("expected error but got nil")
			}
			if !tc.wantErr && err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
		})
	}
}
