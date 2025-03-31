package main

import (
	"log"
	"net/http"

	nc "example/challenge"
)

func main() {
	app := nc.NewDashboardApp()
	app.Start()

	app.InitializeRoutes()

	port := ":8080"

	log.Printf("Starting server on port %s", port)
	log.Fatal(http.ListenAndServe(port, app.Router))
}
