package store

import "errors"

var ErrConflict = errors.New("conflict")
var ErrNotFound = errors.New("not found")
var ErrForbidden = errors.New("forbidden")
var ErrCapacityFull = errors.New("capacity full")
