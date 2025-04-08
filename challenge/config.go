package challenge

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
)

type Config struct {
	UpdateFrequency     map[string]int `json:"updateFrequency"`
	PluginsEnabled      []string       `json:"pluginsEnabled"`
	AutoUpdateEnabled   bool           `json:"autoUpdateEnabled"`
	AutoUpdateFrequency int            `json:"autoUpdateFrequency"`
}

func (app *DashboardApp) loadConfig() Config {
	var config Config

	data, err := os.ReadFile(app.configFile)

	if err != nil {
		log.Printf("Config file not found. Creating default config.")

		config = Config{
			UpdateFrequency: map[string]int{
				"cats": 300, // seconds (5 min)
				"dogs": 420, // seconds (7 min)
			},
			PluginsEnabled:      []string{"cats", "dogs"},
			AutoUpdateEnabled:   true,
			AutoUpdateFrequency: 86400, // seconds (1 day)
		}

		app.saveConfig(config)

		return config
	}

	if err := json.Unmarshal(data, &config); err != nil {
		log.Fatalf("Failed to parse config file: %v", err)
	}

	return config
}

func (app *DashboardApp) saveConfig(config Config) {
	app.mutex.Lock()
	defer app.mutex.Unlock()

	data, err := json.MarshalIndent(config, "", "    ")
	if err != nil {
		log.Printf("Failed to serialize config: %v", err)
		return
	}

	if err := os.WriteFile(app.configFile, data, 0644); err != nil {
		log.Printf("Failed to save config file: %v", err)
		return
	}

	app.Config = config
	log.Println("Configuration saved to config.json")
}

func (app *DashboardApp) handleConfig(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case "GET":
		respondWithJSON(w, http.StatusOK, app.Config)

	case "POST":
		var config Config

		body, err := io.ReadAll(r.Body)
		if err != nil {
			respondWithError(w, http.StatusBadRequest, "Error reading request body")
			return
		}
		defer r.Body.Close()

		err = json.Unmarshal(body, &config)
		if err != nil {
			respondWithError(w, http.StatusBadRequest, "Error unmarshalling JSON")
			return
		}
		log.Printf("New Config: %#v\n\n", config)
		app.saveConfig(config)
		respondWithJSON(w, http.StatusOK, app.Config)

	default:
		respondWithError(w, http.StatusMethodNotAllowed, fmt.Sprintf("Error %s not supported", r.Method))
	}

}
