import { Box, Typography, Divider } from '@mui/material';
import { DataSourceResponse, TypeOfData } from '../types';
import WidgetContainer from './WidgetContainer';

interface WidgetProps {
  widgetData: DataSourceResponse;
}

const Widget = ({ widgetData }: WidgetProps) => {
  
  return (
    <>
        <WidgetContainer title={`Latest ${widgetData.title}`} lastUpdated={widgetData.lastUpdated}>
        <Box className="flex flex-col gap-4">
                {widgetData.typeOfData === TypeOfData.Url && (
                    <img src={widgetData.data} width={250} height={250} />
                )}
                {widgetData.typeOfData === TypeOfData.Text && (
                    <Typography variant="body2" className="mb-3 text-gray-700">
                {widgetData.data}
                </Typography>
                )}
        </Box>
        </WidgetContainer>
        <Divider /> 
    </>
  );
};

export default Widget;