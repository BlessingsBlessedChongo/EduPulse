import { useState } from 'react';
import {
  Container, Typography, TextField, Button, Paper, Grid, CircularProgress, Alert
} from '@mui/material';
import { analyzeSentiment, checkGrammar, getRiskAssessment } from '../api/aiApi';
import { useAuth } from '../hooks/useAuth';

export default function AITools() {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [sentimentResult, setSentimentResult] = useState(null);
  const [grammarResult, setGrammarResult] = useState(null);
  const [riskStudentId, setRiskStudentId] = useState('');
  const [riskResult, setRiskResult] = useState(null);
  const [loadingSentiment, setLoadingSentiment] = useState(false);
  const [loadingGrammar, setLoadingGrammar] = useState(false);
  const [loadingRisk, setLoadingRisk] = useState(false);

  const handleSentiment = async () => {
    setLoadingSentiment(true);
    try {
      const res = await analyzeSentiment(text);
      setSentimentResult(res.data);
    } catch (err) { console.error(err); }
    setLoadingSentiment(false);
  };

  const handleGrammar = async () => {
    setLoadingGrammar(true);
    try {
      const res = await checkGrammar(text);
      setGrammarResult(res.data);
    } catch (err) { console.error(err); }
    setLoadingGrammar(false);
  };

  const handleRisk = async () => {
    if (!riskStudentId) return;
    setLoadingRisk(true);
    try {
      const res = await getRiskAssessment(riskStudentId);
      setRiskResult(res.data);
    } catch (err) { console.error(err); }
    setLoadingRisk(false);
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>AI Tools</Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6">Analyze Text</Typography>
        <TextField
          multiline
          rows={4}
          fullWidth
          label="Enter text to analyze"
          value={text}
          onChange={(e) => setText(e.target.value)}
          sx={{ my: 2 }}
        />
        <Grid container spacing={2}>
          <Grid item>
            <Button variant="contained" onClick={handleSentiment} disabled={loadingSentiment}>
              {loadingSentiment ? <CircularProgress size={24} /> : 'Sentiment Analysis'}
            </Button>
          </Grid>
          <Grid item>
            <Button variant="contained" onClick={handleGrammar} disabled={loadingGrammar}>
              {loadingGrammar ? <CircularProgress size={24} /> : 'Grammar Check'}
            </Button>
          </Grid>
        </Grid>

        {sentimentResult && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Sentiment: {sentimentResult.label} (confidence: {Math.round(sentimentResult.confidence * 100)}%)
          </Alert>
        )}
        {grammarResult && (
          <Alert severity={grammarResult.matches.length ? 'warning' : 'success'} sx={{ mt: 2 }}>
            {grammarResult.matches.length} grammar issue(s) found.
          </Alert>
        )}
      </Paper>

      {(user.role === 'TEACHER' || user.role === 'ADMIN') && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6">Student Risk Assessment</Typography>
          <TextField
            label="Student ID"
            value={riskStudentId}
            onChange={(e) => setRiskStudentId(e.target.value)}
            sx={{ my: 2 }}
          />
          <Button variant="contained" onClick={handleRisk} disabled={loadingRisk}>
            {loadingRisk ? <CircularProgress size={24} /> : 'Get Risk Score'}
          </Button>
          {riskResult && (
            <Alert severity={riskResult.risk_score > 50 ? 'error' : 'info'} sx={{ mt: 2 }}>
              Risk Score: {riskResult.risk_score}%
            </Alert>
          )}
        </Paper>
      )}
    </Container>
  );
}