import React from 'react';
import { Card, CardHeader, CardContent, CardActions, Typography, Box } from '@mui/material';

interface WidgetContainerProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

const WidgetContainer = ({ 
  title, 
  lastUpdated, 
  children 
}: WidgetContainerProps) => {
  return (
    <Card className="h-full flex flex-col shadow-md">
      <CardHeader
        title={<Typography variant="h6">{title}</Typography>}
        className="bg-gray-50 border-b border-gray-200"
      />
      <CardContent className="flex-1 overflow-auto">
        {children}
      </CardContent>
      <CardActions className="bg-gray-50 border-t border-gray-200 p-2 flex justify-end">
        <Typography variant="caption" className="text-gray-500">
          Updated: {new Date(lastUpdated).toLocaleString()}
        </Typography>
      </CardActions>
    </Card>
  );
};

export default WidgetContainer;