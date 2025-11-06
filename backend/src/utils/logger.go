package utils

import (
	"log"
	"os"
	"strings"
)

type Logger struct{
	level int
}

const (
	levelError = iota
	levelInfo
	levelDebug
)

var (
	// Use stdout for normal logs (info, debug) so Docker logs look cleaner
	infoLogger  = log.New(os.Stdout, "", log.LstdFlags)
	errorLogger = log.New(os.Stderr, "", log.LstdFlags)
)

func levelFromString(l string) int {
	switch strings.ToLower(l) {
	case "debug":
		return levelDebug
	case "info":
		return levelInfo
	default:
		return levelError
	}
}

func NewLogger(level string) *Logger { return &Logger{level: levelFromString(level)} }

func (l *Logger) Debugf(format string, v ...any) {
	if l.level >= levelDebug { 
		infoLogger.Printf("DEBUG: "+format, v...)
	}
}

func (l *Logger) Infof(format string, v ...any) {
	if l.level >= levelInfo { 
		infoLogger.Printf("INFO: "+format, v...)
	}
}

func (l *Logger) Errorf(format string, v ...any) { 
	errorLogger.Printf("ERROR: "+format, v...)
}

func (l *Logger) Info(msg string)  { l.Infof("%s", msg) }
func (l *Logger) Debug(msg string) { l.Debugf("%s", msg) }
func (l *Logger) Error(msg string) { l.Errorf("%s", msg) }
