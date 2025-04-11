package main

import (
	"log"
	"net/http"
	"os"

	nc "example/challenge"
)

func main() {
	url := os.Getenv("PATH_TO_NAMETAG_REPO")
	app := nc.NewDashboardApp(url)
	app.Start()

	app.InitializeRoutes()

	port := ":8080"

	log.Printf("Starting server on port %s", port)
	log.Fatal(http.ListenAndServe(port, app.Router))
}
