package challenge

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	pl "example/plugins"

	"github.com/go-git/go-git/config"
	"github.com/go-git/go-git/v5"
	"github.com/gorilla/mux"
	"github.com/robfig/cron/v3"
)

type DashboardApp struct {
	Config           Config
	DataSources      map[string]pl.DataSource
	AvailableSources map[string]pl.DataSource
	LastUpdated      map[string]time.Time
	Scheduler        *cron.Cron
	Router           *mux.Router
	mutex            sync.RWMutex
	dataDir          string
	configFile       string
	pluginsFile      string
}

func NewDashboardApp() *DashboardApp {
	app := &DashboardApp{
		DataSources:      make(map[string]pl.DataSource),
		AvailableSources: make(map[string]pl.DataSource),
		LastUpdated:      make(map[string]time.Time),
		Scheduler:        cron.New(),
		dataDir:          "data",
		configFile:       "config.json",
		pluginsFile:      "plugins.json",
	}

	if err := os.MkdirAll(app.dataDir, 0755); err != nil {
		log.Fatalf("Failed to create data directory: %v", err)
	}

	app.Config = app.loadConfig()

	availablePlugins, err := pl.LoadAvailablePlugins(app.pluginsFile)
	if err != nil {
		log.Fatalf("Failed to parse plugins file: %v", err)
	}
	app.AvailableSources = availablePlugins

	for key := range app.AvailableSources {
		enabled := false
		for _, plugin := range app.Config.PluginsEnabled {
			if plugin == key {
				enabled = true
				break
			}
		}
		if enabled {
			app.DataSources[key] = app.AvailableSources[key]
		}
	}

	// for plugin := range app.DataSources {
	// 	if _, exists := app.Config.UpdateFrequency[plugin]; exists {
	// 		interval := app.Config.UpdateFrequency[plugin]
	// 		scheduleExpr := fmt.Sprintf("@every %ds", interval)
	// 		log.Printf("%#v\n\n", app.DataSources[plugin])
	// 		app.Scheduler.AddFunc(scheduleExpr, func() {
	// 			app.DataSources[plugin].FetchData()
	// 		})

	// 		log.Printf("Scheduled updates for %s every %d seconds", plugin, interval)
	// 	}
	// }

	app.Router = mux.NewRouter()

	fmt.Printf("%+v\n\n", app)
	return app
}

func (app *DashboardApp) InitializeRoutes() {
	app.Router.HandleFunc("/api/datasources", CorsHandler(app.getAvaiableDataSources)).Methods("GET")

	app.Router.HandleFunc("/api/data/{source}", CorsHandler(app.getSourceData)).Methods("GET")

	app.Router.HandleFunc("/api/config", CorsHandler(app.handleConfig))
}

func (app *DashboardApp) getSourceData(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	source := vars["source"]

	if _, exists := app.DataSources[source]; !exists {
		respondWithError(w, http.StatusNotFound, "Data source not found")
		return
	}

	result, err := app.DataSources[source].FetchData()
	if err != nil {
		respondWithError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondWithJSON(w, http.StatusOK, result)
}

func (app *DashboardApp) getAvaiableDataSources(w http.ResponseWriter, r *http.Request) {
	respondWithJSON(w, http.StatusOK, app.AvailableSources)
}

func (app *DashboardApp) checkForUpdates() {
	if !app.Config.AutoUpdateEnabled {
		return
	}

	log.Println("Checking for code updates...")

	repoPath := "/path/to/your/git/repository"
	repo, err := git.PlainOpen(repoPath)
	if err != nil {
		log.Printf("Error opening git repository: %v", err)
		return
	}

	commitHash := "6264fafeecd62fa0e1339f31507d0a03b751beaa"

	err = repo.Fetch(&git.FetchOptions{
		RemoteName: "origin",
		RefSpecs: []config.RefSpec{
			config.RefSpec(commitHash + ":" + commitHash),
		},
	})
	if err != nil && err != git.NoErrAlreadyUpToDate {
		log.Println("No updates available")
		return
	}

	log.Println("Updates pulled successfully")
	restartApp()
}

func (app *DashboardApp) Start() {
	scheduleExpr := fmt.Sprintf("@every %ds", app.Config.AutoUpdateFrequency)
	app.Scheduler.AddFunc(scheduleExpr, app.checkForUpdates)

	app.Scheduler.Start()

	log.Println("Dashboard started successfully")
}
