import React, { useState } from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    TextField,
} from '@mui/material';
import { DataSource, DataSourceResponse } from '../types';

interface EditDialogProps {
    open: boolean;
    onClose: (value: boolean, frequency?: number) => void;
    editPlugin?: DataSourceResponse;
  }
  
  const EditDialog = ({ open, onClose, editPlugin }: EditDialogProps) => {
    const [frequency, setFrequency] = useState<number | undefined>(editPlugin?.updateFrequency);
    const [error, setError] = useState('');
   
    const handleCancel = (value: boolean) => {
       onClose(value);
    };
    
    const handleClose = (value: boolean) => {
        if (!!frequency && frequency >= 5 && frequency <= 10) {
            onClose(value, frequency);
        } else {
            setError('Frequency needs to be between 5 and 10');
        }
    };

   const handleFrequencyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setError('');
        const frequency = +event.target.value;
        if (frequency >= 5 && frequency <= 10) {
            setFrequency(+event.target.value);
        } else {
            setError('Frequency needs to be between 5 and 10');
        }
   };
  
    return (
      <Dialog open={open} onClose={() => handleCancel(false)}>
        <DialogTitle>Edit Plugin</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {`Change the frequency of the ${editPlugin?.title} plugin.`}
          </DialogContentText>
          <TextField
            autoFocus
            required
            margin="dense"
            id="frequency"
            name="frequency"
            label="Update Frequency"
            type="number"
            variant="standard"
            value={frequency || editPlugin?.updateFrequency}
            onChange={handleFrequencyChange}
            error={!!error}
            helperText='Please enter a number between 5 and 10.'
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleCancel(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={() => handleClose(true)} color="primary" autoFocus>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  export default EditDialog;
  