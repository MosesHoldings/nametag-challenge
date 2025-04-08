package plugins

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type DataSource interface {
	FetchData() (map[string]interface{}, error)
}

type Plugin struct {
	Name        string `json:"name"`
	BaseURL     string `json:"baseUrl"`
	PathToData  string `json:"pathToData"`
	Description string `json:"description"`
	TypeOfData  int    `json:"typeOfData"`
	IsNew       bool   `json:"isNew"`
}

func LoadAvailablePlugins(pluginsFile string) (map[string]DataSource, error) {
	var plugins map[string]Plugin
	var dataSources map[string]DataSource = make(map[string]DataSource)

	data, err := os.ReadFile(pluginsFile)

	if err != nil {
		log.Printf("Plugin file not found. Please make sure the file exists.")
		return nil, err
	}

	if err := json.Unmarshal(data, &plugins); err != nil {
		log.Fatalf("Failed to parse plugins file: %v", err)
		return nil, err
	}

	for key := range plugins {
		plugin := plugins[key]
		dataSources[key] = &plugin
	}

	return dataSources, nil
}

func (p *Plugin) FetchData() (map[string]interface{}, error) {
	var result map[string]interface{}
	var resp []map[string]interface{}

	url := p.BaseURL

	response, err := http.Get(url)
	if err != nil {
		return nil, errors.New("get response failed")
	}

	body, err2 := io.ReadAll(response.Body)
	if err2 != nil {
		return nil, errors.New("get response - get body failed")
	}

	err3 := json.Unmarshal(body, &result)
	if err3 != nil {
		log.Printf("%#v\n\n", err3)
		log.Printf("The response maybe an array trying again\n\n")
		err4 := json.Unmarshal(body, &resp)
		if err4 != nil {
			log.Printf("%#v\n\n", err4)
			return nil, errors.New("get response - unmarshaling failed")
		}
		log.Printf("The response was an array, setting first item as the result\n\n")

		result = resp[0]
	}

	log.Printf("The result: %#v\n\n", result)
	if strings.Contains(p.PathToData, ".") {
		paths := strings.Split(p.PathToData, ".")
		pathsLength := len(paths) - 1

		temp := result
		for i, path := range paths {
			for key := range temp {
				if key != path {
					delete(temp, key)
				}
			}

			if i < pathsLength {
				temp = temp[path].(map[string]interface{})
			}
		}
		result = temp
	} else {
		for key := range result {
			if key != p.PathToData {
				delete(result, key)
			}
		}
	}

	result["_meta"] = map[string]interface{}{
		"collectedAt": time.Now().Format(time.RFC3339),
		"typeOfData":  p.TypeOfData,
	}

	p.updateHistoricalData(result)

	return result, nil
}

func (p *Plugin) updateHistoricalData(currentData map[string]interface{}) {
	historyFile := filepath.Join("data", fmt.Sprintf("%s_history.json", p.Name))
	var history []map[string]interface{}

	data, err := os.ReadFile(historyFile)
	if err != nil {
		log.Printf("Failed to parse %s history: %v", p.Name, err)
		history = []map[string]interface{}{}
	} else {
		if err := json.Unmarshal(data, &history); err != nil {
			log.Printf("Failed to parse %s history: %v", p.Name, err)
			history = []map[string]interface{}{}
		}
	}
	history = append(history, map[string]interface{}{
		"timestamp": currentData["_meta"].(map[string]interface{})["collected_at"],
		"data":      currentData,
	})

	if len(history) > 1000 {
		history = history[len(history)-1000:]
	}

	jsonData, err := json.MarshalIndent(history, "", "    ")
	if err != nil {
		log.Printf("Failed to serialize %s history: %v", p.Name, err)
		return
	}

	if err := os.WriteFile(historyFile, jsonData, 0644); err != nil {
		log.Printf("Failed to save %s history: %v", p.Name, err)
		return
	}
}
