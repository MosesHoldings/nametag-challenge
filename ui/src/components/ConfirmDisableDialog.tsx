import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
} from '@mui/material';
import { DataSource } from '../types';

interface ConfirmDisableDialogProps {
    open: boolean;
    onClose: (value: boolean) => void;
    pluginName: string;
  }
  
  const ConfirmDisableDialog = ({ open, onClose, pluginName }: ConfirmDisableDialogProps) => {
    const handleClose = (value: boolean) => {
      onClose(value);
    };
  
    return (
      <Dialog open={open} onClose={() => handleClose(false)}>
        <DialogTitle>{`Confirm Disabling ${pluginName}`}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {`Are you sure you want to disable the ${pluginName} plugin?`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleClose(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={() => handleClose(true)} color="primary" autoFocus>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  export default ConfirmDisableDialog;
  