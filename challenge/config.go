package challenge

import (
	"encoding/json"
	"log"
	"os"
)

type Config struct {
	UpdateFrequency     map[string]int `json:"update_frequency"`
	PluginsEnabled      []string       `json:"plugins_enabled"`
	AutoUpdateEnabled   bool           `json:"auto_update_enabled"`
	AutoUpdateFrequency int            `json:"auto_update_frequency"`
}

func (app *DashboardApp) loadConfig() Config {
	var config Config

	data, err := os.ReadFile(app.configFile)

	if err != nil {
		log.Printf("Config file not found. Creating default config.")

		config = Config{
			UpdateFrequency: map[string]int{
				"cats":   300, // seconds (5 min)
				"dogs":   420, // seconds (7 min)
				"advice": 360, // seconds (6 min)
			},
			PluginsEnabled:      []string{"cats", "dogs", "advice"},
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
