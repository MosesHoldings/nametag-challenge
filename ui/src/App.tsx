import { useState, useEffect } from 'react';
import { 
  Alert,
  Box, 
  Button,
  CircularProgress, 
  Container, 
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography 
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import StarIcon from '@mui/icons-material/Star';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Widget from './components/Widget';
import { Config, DataSource, DataSourceResponse } from './types';
import ConfirmationDialog from './components/ConfirmationDialog';
import ConfirmDisableDialog from './components/ConfirmDisableDialog';
import EditDialog from './components/EditDialog';
import EditConfigDialog from './components/EditConfigDialog';

const theme = createTheme({
    palette: {
      primary: {
        main: '#3f51b5',
      },
      secondary: {
        main: '#f50057',
      },
      background: {
        default: '#f5f7fa',
      },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    },
  });

const App = () => {
  const [dataSources, setDataSources] = useState<Record<string, DataSourceResponse>>({});
  const [availableSources, setAvailableSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [config, setConfig] = useState<Config | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [disableDialogOpen, setDisableDialogOpen] = useState<boolean>(false);
  const [editDialogOpen, setEditDialogOpen] = useState<boolean>(false);
  const [editConfigDialogOpen, setEditConfigDialogOpen] = useState<boolean>(false);
  const [selectedPluginName, setSelectedPluginName] = useState<string>('');
  const [selectedPlugin, setSelectedPlugin] = useState<DataSource>();
  const [selectedEditPlugin, setSelectedEditPlugin] = useState<DataSourceResponse>();
  const [updatedConfig, setUpdatedConfig] = useState<boolean>(false); 

  const handleDisableClick = () => {
    setDisableDialogOpen(true);
  };

  const handleDisbaleCloseDialog = (value: boolean) => {
    setDisableDialogOpen(false);
    if (value) {
      const configPluginsEnabled = config?.pluginsEnabled.filter((plugin) => plugin !== selectedPluginName);
      delete config?.updateFrequency[selectedPluginName];
      
      const newConfig: Config = {
        ...config!,
        pluginsEnabled: configPluginsEnabled || [],
      };
      handleConfigUpdate(newConfig);
    }
  };
  
  const handleEditClick = () => {
    setEditDialogOpen(true);
  };

  const handleEditCloseDialog = (value: boolean, frequency?: number) => {
    setEditDialogOpen(false);
    
    if (value && !!frequency && selectedEditPlugin) {
      const updatedFrequency = {
        ...config?.updateFrequency,
        [selectedEditPlugin.title]: frequency * 60,
      };
      
      const newConfig: Config = {
        ...config!,
        updateFrequency: updatedFrequency,
      };
      handleConfigUpdate(newConfig);
    }
  };

  const handleClick = () => {
    setDialogOpen(true);
  };

  const handleCloseDialog = (value: boolean, frequency?: number) => {
    setDialogOpen(false);
    if (value && !!frequency && selectedPlugin) {
      const updatedFrequency = {
        ...config?.updateFrequency,
        [selectedPlugin.name]: frequency * 60,
      };

      config!.pluginsEnabled.push(selectedPlugin.name);
      const newConfig: Config = {
        ...config!,
        updateFrequency: updatedFrequency,
      };
      handleConfigUpdate(newConfig);
    }
  };
  
  const handleEditConfigClick = () => {
    setEditConfigDialogOpen(true);
  };

  const handleEditConfigCloseDialog = (cancel: boolean, updateEnabled?: boolean, updateFrequency?: number) => {
    setEditConfigDialogOpen(false);

    if (!cancel) {
      let newConfig: Config;
      if (updateEnabled && !!updateFrequency) {
        newConfig = {
          ...config!,
          autoUpdateEnabled: updateEnabled,
          autoUpdateFrequency: updateFrequency * 3600,
        };
        handleConfigUpdate(newConfig);
      } else {
        newConfig = {
          ...config!,
          autoUpdateEnabled: false,
          autoUpdateFrequency: 0,
        };
        handleConfigUpdate(newConfig);
      }
    }
  };

  const handleConfigUpdate = (newConfig: Config) => {
    (async () => {
      const rawResponse = await fetch('http://localhost:8080/api/config', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newConfig),
      });
      const updatedConfig = await rawResponse.json();
    
      console.log(updatedConfig);
      setUpdatedConfig(true);
      setConfig(updatedConfig);
    })();
  };

  const handleDataSourceUpdates = () => {
    (async () => {
      if (config) {
       // console.log({config});
        const fetchPromises = config.pluginsEnabled.map(async (source: string) => {
          try {
            const sourceResponse = await fetch(`http://localhost:8080/api/data/${source}`);
            if (!sourceResponse.ok) {
              throw new Error(`Failed to fetch ${source} data`);
            }
            const result = await sourceResponse.json();
            return [source, result];
          } catch (err) {
            console.error(`Error fetching ${source}:`, err);
            return [source, null];
          }
        });
        
        const results = await Promise.all(fetchPromises);
        const newData: Record<string, any> = {};
        results.forEach(([source, data]) => {
          if (data) {
            newData[source as string] = {
                data: data._meta.typeOfData === 2 ? data.url : data[source],
                typeOfData: data._meta.typeOfData,
                lastUpdated: data._meta.collectedAt,
                title: source,
                updateFrequency: !!config?.updateFrequency[source] ?  config?.updateFrequency[source] / 60  : 5,
            };
          }
        });
        
        setDataSources(newData);
      }
    })();
  };

  const isPluginEnabled = (source: string): boolean => {
    return config?.pluginsEnabled.includes(source.toLowerCase()) || false;
  }

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('http://localhost:8080/api/config');
        if (!response.ok) {
          throw new Error(`Failed to fetch config: ${response.status} ${response.statusText}`);
        }
        const data: Config = await response.json();
        setConfig(data);

        const availableResponse = await fetch('http://localhost:8080/api/datasources');
        if (!availableResponse.ok) {
          throw new Error(`Failed to fetch datasources: ${availableResponse.status} ${availableResponse.statusText}`);
        }
        const dataJson  = await availableResponse.json();
        const availableSources = Object.keys(dataJson).map(key => {
          return {
            name: dataJson[key].name,
            description: dataJson[key].description,
            isNew: dataJson[key].isNew,
          }
        });
        setAvailableSources(availableSources);
        
        const fetchPromises = data.pluginsEnabled.map(async (source: string) => {
          try {
            const sourceResponse = await fetch(`http://localhost:8080/api/data/${source}`);
            if (!sourceResponse.ok) {
              throw new Error(`Failed to fetch ${source} data`);
            }
            const result = await sourceResponse.json();
            return [source, result];
          } catch (err) {
            console.error(`Error fetching ${source}:`, err);
            return [source, null];
          }
        });
        
        const results = await Promise.all(fetchPromises);
        const newData: Record<string, any> = {};
        results.forEach(([source, data]) => {
          if (data) {
            newData[source as string] = {
                data: data._meta.typeOfData === 2 ? data.url : data[source],
                typeOfData: data._meta.typeOfData,
                lastUpdated: data._meta.collectedAt,
                title: source,
                updateFrequency: !!config?.updateFrequency[source] ?  config?.updateFrequency[source] / 60  : 5,
            };
          }
        });
        
        setDataSources(newData);
      } catch (err) {
        setError((err as Error).message);
        console.error('Error fetching configuration:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchConfig();
  }, []);

  useEffect(() => {
    if (updatedConfig) {
      if (config?.pluginsEnabled.length === 0) {
        setDataSources({});
      } else {
        handleDataSourceUpdates();
      }
      setUpdatedConfig(false);
    }

    if (!config?.updateFrequency && !config?.autoUpdateEnabled) return;
    
    const intervals: Record<string, number> = {};
    
    Object.entries(config.updateFrequency).forEach(([source, seconds]) => {
      if (config.pluginsEnabled.includes(source)) {
        intervals[source] = window.setInterval(async () => {
          try {
            const response = await fetch(`http://localhost:8080/api/data/${source}`);
            if (!response.ok) {
              throw new Error(`Failed to refresh ${source} data`);
            }
            const data = await response.json();
            setDataSources(prev => ({
              ...prev,
              [source]: {
                data: data._meta.typeOfData === 2 ? data.url : data[source],
                typeOfData: data._meta.typeOfData,
                lastUpdated: data._meta.collectedAt,
                title: source,
                updateFrequency: seconds / 60,
            }
            }));
          } catch (err) {
            console.error(`Error refreshing ${source}:`, err);
          }
        }, seconds * 1000); // Convert to milliseconds
      }
    });

    if (config.autoUpdateEnabled) {
      intervals["availableSources"] = window.setInterval(async () => {
        try {
          const availableResponse = await fetch('http://localhost:8080/api/datasources');
          if (!availableResponse.ok) {
            throw new Error(`Failed to fetch datasources: ${availableResponse.status} ${availableResponse.statusText}`);
          }
          const dataJson  = await availableResponse.json();
          const availableSources = Object.keys(dataJson).map(key => {
            return {
              name: dataJson[key].name,
              description: dataJson[key].description,
              isNew: dataJson[key].isNew,
            }
          });
          setAvailableSources(availableSources);
        } catch (err) {
          console.error(`Error refreshing available sources:`, err);
        }
      }, config.autoUpdateFrequency * 1000); 
    }
    
    return () => {
      Object.values(intervals).forEach(interval => window.clearInterval(interval));
    };
  }, [config]);

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box className="flex flex-col items-center justify-center h-screen">
          <CircularProgress size={60} thickness={4} />
          <Typography variant="h6" className="mt-4 text-gray-600">
            Loading dashboard...
          </Typography>
        </Box>
      </ThemeProvider>
    );
  }

  if (error) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box className="flex flex-col items-center justify-center h-screen p-4">
          <Alert severity="error" className="mb-4 w-full max-w-md">
            {error}
          </Alert>
          <Typography variant="h5" className="mb-4">
            Error Loading Dashboard
          </Typography>
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box className="min-h-screen bg-gray-100">
        <Box className="bg-white shadow-md">
          <Container maxWidth="lg" className="py-4">
            <Box className="flex flex-col md:flex-row justify-between items-start md:items-center mb-20">
              <Typography variant="h4" component="h1" className="font-medium text-gray-800">
                Dashboard
              </Typography>
              <Typography variant="body2" className="text-gray-500 mt-2 md:mt-0">
                Last self-check: {new Date().toLocaleString()}
              </Typography>
            </Box>
          </Container>
        </Box>
        <Stack direction="row" spacing={2}>
          <Stack direction="column" spacing={5}>
            <List sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper' }}>
              {availableSources.map((source) => {
                if (isPluginEnabled(source.name)) {
                  return (
                    <ListItem
                      key={source.name}
                      secondaryAction={
                        <>
                          <Button aria-label="edit" onClick={() => { setSelectedEditPlugin(dataSources[source.name]); handleEditClick() }}>
                            EditIcon
                          </Button>
                          <Button aria-label="disable" onClick={() => { setSelectedPluginName(source.name); handleDisableClick() }}>
                            Remove
                          </Button>
                        </>
                      }
                      disablePadding
                    >
                      <ListItemText id={source.name} inset primary={source.name} secondary={source.description}/>
                    </ListItem>
                  );
                } else {
                return (
                  <ListItem
                    key={source.name}
                    secondaryAction={
                      <Button aria-label="add" onClick={() => { setSelectedPlugin(source); handleClick()}}>
                          Add
                        </Button>
                    }
                    disablePadding
                  >
                    {source.isNew ? (
                      <ListItemButton role={undefined} dense>
                      
                        <ListItemIcon>
                          <StarIcon />
                        </ListItemIcon>
                        <ListItemText id={source.name} primary={source.name} secondary={source.description}/>
                      
                      </ListItemButton>
                    )
                    : (
                        <ListItemButton role={undefined} dense>
                          <ListItemText id={source.name} inset primary={source.name} secondary={source.description}/>
                        
                        </ListItemButton>
                      )
                      }
                  </ListItem>
                );
              }})}
            </List>
            <div className="ml-4" >
              <Button variant="outlined" startIcon={<EditIcon />} onClick={() => handleEditConfigClick() }>
                Settings
              </Button>
            </div>
          </Stack>
          <ConfirmationDialog open={dialogOpen} onClose={handleCloseDialog} plugin={selectedPlugin} />
          <ConfirmDisableDialog open={disableDialogOpen} onClose={handleDisbaleCloseDialog} pluginName={selectedPluginName} />
          <EditDialog open={editDialogOpen} onClose={handleEditCloseDialog} editPlugin={selectedEditPlugin} />
          <EditConfigDialog open={editConfigDialogOpen} onClose={handleEditConfigCloseDialog} config={config} />
            
          <Container maxWidth="md" className="py-8">
            <Box className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

              {Object.keys(dataSources).length > 0 && Object.keys(dataSources).map(key => 
                <Widget widgetData={dataSources[key]} />
              )}

              {Object.keys(dataSources).length === 0 && (
                <Box className="flex flex-col gap-4">
                  <Typography variant="h5" className="mb-4">
                    No plugins enabled
                  </Typography>
                </Box>
              )}

            </Box>
          </Container>
        </Stack>
      </Box>
    </ThemeProvider>
  );
};

export default App;
