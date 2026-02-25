import React, { useState, useEffect } from 'react';
import {
  Alert,
  Box,
  Button,
  Container,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import './App.css';

const sortItemsByNameDesc = (items) => {
  return [...items].sort((left, right) => right.name.localeCompare(left.name));
};

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newItem, setNewItem] = useState('');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/items');
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const result = await response.json();
      setData(sortItemsByNameDesc(result));
      setError(null);
    } catch (err) {
      setError('Failed to fetch data: ' + err.message);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newItem.trim()) return;

    try {
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newItem, due_date: dueDate || null }),
      });

      if (!response.ok) {
        throw new Error('Failed to add item');
      }

      const result = await response.json();
      setData(sortItemsByNameDesc([...data, result]));
      setNewItem('');
      setDueDate('');
      setError(null);
    } catch (err) {
      setError('Error adding item: ' + err.message);
      console.error('Error adding item:', err);
    }
  };

  const handleDelete = async (itemId) => {
    try {
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete item');
      }

      setData(data.filter(item => item.id !== itemId));
      setError(null);
    } catch (err) {
      setError('Error deleting item: ' + err.message);
      console.error('Error deleting item:', err);
    }
  };

  return (
    <Container maxWidth="md" className="App">
      <Stack component="header" spacing={1} className="App-header">
        <Typography component="h1" variant="h3">
          To Do App
        </Typography>
        <Typography component="p" variant="body1">
          Keep track of your tasks
        </Typography>
      </Stack>

      <Stack component="main" spacing={3}>
        <Paper component="section" elevation={1} sx={{ p: 3 }}>
          <Typography component="h2" variant="h5" gutterBottom>
            Add New Item
          </Typography>
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                id="task-name"
                label="Task name"
                value={newItem}
                onChange={(event) => setNewItem(event.target.value)}
                fullWidth
                required
              />
              <TextField
                id="task-due-date"
                label="Due date"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <Button type="submit" variant="contained">
                Add Item
              </Button>
            </Stack>
          </Box>
        </Paper>

        <Paper component="section" elevation={1} sx={{ p: 3 }}>
          <Typography component="h2" variant="h5" gutterBottom>
            Items from Database
          </Typography>

          {loading && (
            <Typography aria-live="polite" role="status">
              Loading data...
            </Typography>
          )}

          {error && (
            <Alert severity="error" role="alert" aria-live="assertive">
              {error}
            </Alert>
          )}

          {!loading && !error && data.length === 0 && (
            <Typography aria-live="polite" role="status">
              No items found. Add some!
            </Typography>
          )}

          {!loading && !error && data.length > 0 && (
            <List aria-label="Task list">
              {data.map((item) => (
                <ListItem
                  key={item.id}
                  divider
                  secondaryAction={
                    <Button
                      onClick={() => handleDelete(item.id)}
                      color="error"
                      type="button"
                      variant="outlined"
                      aria-label={`Delete ${item.name}`}
                    >
                      Delete
                    </Button>
                  }
                >
                  <ListItemText
                    primary={item.name}
                    secondary={item.due_date ? `Due: ${item.due_date}` : 'Due: Not set'}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
      </Stack>
    </Container>
  );
}

export default App;