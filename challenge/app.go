package challenge

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	pl "example/plugins"

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

	repo, err := git.PlainOpen(".")
	if err != nil {
		log.Printf("Error opening git repository: %v", err)
		return
	}

	worktree, err := repo.Worktree()
	if err != nil {
		log.Printf("Error getting worktree: %v", err)
		return
	}

	head, err := repo.Head()
	if err != nil {
		log.Printf("Error getting HEAD: %v", err)
		return
	}
	currentHash := head.Hash()

	fetchOptions := &git.FetchOptions{
		RemoteName: "origin",
		Progress:   os.Stdout,
	}

	log.Println("Fetching updates...")
	err = repo.Fetch(fetchOptions)
	if err != nil && err != git.NoErrAlreadyUpToDate {
		log.Printf("Error fetching updates: %v", err)
		return
	}

	remoteBranch, err := repo.Reference("refs/remotes/origin/main", true)
	if err != nil {
		log.Printf("Error getting remote branch reference: %v", err)
		return
	}

	remoteHash := remoteBranch.Hash()

	if currentHash.String() == remoteHash.String() {
		log.Println("No updates available")
		return
	}

	log.Printf("Updates available. Current: %s, Remote: %s\n", currentHash.String(), remoteHash.String())

	pullOptions := &git.PullOptions{
		RemoteName:    "origin",
		SingleBranch:  true,
		Progress:      os.Stdout,
		ReferenceName: remoteBranch.Name(),
	}

	log.Println("Pulling updates using merge strategy...")
	err = worktree.Pull(pullOptions)

	if err == git.NoErrAlreadyUpToDate {
		log.Println("No updates available")
		return
	} else if err != nil {
		if err == git.ErrNonFastForwardUpdate {
			log.Printf("Error non-fast-forward update detected: %v", err)
		} else {
			log.Printf("Error pulling updates: %v", err)
		}
	}

	newHead, err := repo.Head()
	if err != nil {
		log.Printf("Error getting new HEAD: %v", err)
	}
	newHash := newHead.Hash()

	if currentHash.String() != newHash.String() {
		log.Printf("Updates successfully pulled. New hash: %s\n", newHash.String())
		restartApp()
		return
	}

	log.Println("No changes after pull")
}

func (app *DashboardApp) Start() {
	scheduleExpr := fmt.Sprintf("@every %ds", app.Config.AutoUpdateFrequency)
	app.Scheduler.AddFunc(scheduleExpr, app.checkForUpdates)

	app.Scheduler.Start()

	log.Println("Dashboard started successfully")
}
