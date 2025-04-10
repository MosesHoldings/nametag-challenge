import React, { useState } from 'react';
import {
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    FormControlLabel,
    TextField,
} from '@mui/material';
import { Config } from '../types';

interface EditConfigDialogProps {
    open: boolean;
    onClose: (cancel: boolean, updateEnabled?: boolean, updateFrequency?: number) => void;
    config: Config | null;
  }
  
  const EditConfigDialog = ({ open, onClose, config }: EditConfigDialogProps) => {
    const [autoUpdateEnabled, setAutoUpdateEnabled] = useState<boolean>(config?.autoUpdateEnabled || false);
    const [autoUpdateFrequency, setAutoUpdateFrequency] = useState<number>(config?.autoUpdateFrequency ? config.autoUpdateFrequency / 3600 : 0);
    const [error, setError] = useState('');
   
    const handleCancel = (value: boolean) => {
       onClose(value);
    };
    
    const handleClose = (value: boolean) => {
        if (!!autoUpdateFrequency && autoUpdateFrequency >= 1 && autoUpdateFrequency <= 24) {
            onClose(value, autoUpdateEnabled, autoUpdateFrequency);
        } else {
            setError('Update frequency needs to be between 1 and 24 hours');
        }
    };

    const handleAutoUpdateChnage = (event: React.ChangeEvent<HTMLInputElement>) => {
      setError('');
      setAutoUpdateEnabled(event.target.checked);
    };
  

   const handleFrequencyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setError('');
        const frequency = +event.target.value;
        if (frequency >= 1 && frequency <= 24) {
          setAutoUpdateFrequency(+event.target.value);
        } else {
            setError('Update frequency needs to be between 1 and 24 hours');
        }
   };
  
    return (
      <Dialog open={open} onClose={() => handleCancel(true)}>
        <DialogTitle>Edit Config Settings</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Edit your config settings
          </DialogContentText>
          <FormControlLabel
            control={<Checkbox checked={autoUpdateEnabled} onChange={handleAutoUpdateChnage} />}
            label="Auto Update Enabled"
          />
          <TextField
            autoFocus
            required={autoUpdateEnabled}
            margin="dense"
            id="frequency"
            name="frequency"
            label="Update Frequency"
            type="number"
            variant="standard"
            value={autoUpdateFrequency}
            onChange={handleFrequencyChange}
            error={!!error}
            helperText='Please enter a number between 1 and 24.'
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleCancel(true)} color="primary">
            Cancel
          </Button>
          <Button onClick={() => handleClose(false)} color="primary" autoFocus>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  export default EditConfigDialog;
  