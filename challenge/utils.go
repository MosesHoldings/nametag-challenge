package challenge

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"syscall"
)

func restartApp() {
	self, err := os.Executable()
	if err != nil {
		log.Printf("Error restarting app while getting os.Executable: %v", err)
	}
	args := os.Args
	env := os.Environ()

	if runtime.GOOS == "windows" {
		cmd := exec.Command(self, args[1:]...)
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
		cmd.Stdin = os.Stdin
		cmd.Env = env
		err := cmd.Run()
		if err == nil {
			os.Exit(0)
		}
		log.Printf("Error restarting app while on Windows: %v", err)
	}

	err1 := syscall.Exec(self, args, env)
	if err1 != nil {
		log.Printf("Error restarting app: %v", err)
	}
}

func CorsHandler(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		//fmt.Printf("preflight detected: %+v\n\n", r.Header)
		w.Header().Set("Connection", "keep-alive")
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, DELETE, PUT")
		w.Header().Set("Access-Control-Allow-Headers", "content-type, Authorization")
		w.Header().Set("Access-Control-Max-Age", "86400")

		if r.Method == "OPTIONS" {
			//http.Error(w, "No Content", http.StatusNoContent)
			return
		}

		next(w, r)
	}
}

func respondWithError(w http.ResponseWriter, code int, message string) {
	respondWithJSON(w, code, map[string]string{"error": message})
}

func respondWithJSON(w http.ResponseWriter, code int, payload interface{}) {
	response, _ := json.Marshal(payload)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	w.Write(response)
}
