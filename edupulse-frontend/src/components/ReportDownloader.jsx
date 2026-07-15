import { useState } from 'react';
import { Button, Menu, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, InputLabel, FormControl } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import API from '../api/axios';

export default function ReportDownloader({ reportType, classId }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('pdf');

  const handleClick = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleDownload = async (format) => {
    setAnchorEl(null);
    try {
      const response = await API.post('/reports/generate/', {
        report_type: reportType,
        format: format,
        class_id: classId,
      }, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report.${format}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <Button variant="contained" startIcon={<DownloadIcon />} onClick={handleClick}>
        Download Report
      </Button>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
        <MenuItem onClick={() => handleDownload('pdf')}>PDF</MenuItem>
        <MenuItem onClick={() => handleDownload('excel')}>Excel</MenuItem>
        <MenuItem onClick={() => handleDownload('csv')}>CSV</MenuItem>
      </Menu>
    </>
  );
}