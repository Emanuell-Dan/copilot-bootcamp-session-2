import React, { act } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import App from '../App';

// Mock server to intercept API requests
const server = setupServer(
  // GET /api/items handler
  rest.get('/api/items', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        { id: 1, name: 'Zulu Task', due_date: '2026-04-01', created_at: '2023-01-01T00:00:00.000Z' },
        { id: 2, name: 'Alpha Task', due_date: null, created_at: '2023-01-02T00:00:00.000Z' },
      ])
    );
  }),
  
  // POST /api/items handler
  rest.post('/api/items', (req, res, ctx) => {
    const { name, due_date: dueDate } = req.body;
    
    if (!name || name.trim() === '') {
      return res(
        ctx.status(400),
        ctx.json({ error: 'Item name is required' })
      );
    }

    if (dueDate && Number.isNaN(Date.parse(dueDate))) {
      return res(
        ctx.status(400),
        ctx.json({ error: 'Due date must be a valid date string' })
      );
    }
    
    return res(
      ctx.status(201),
      ctx.json({
        id: 3,
        name,
        due_date: dueDate || null,
        created_at: new Date().toISOString(),
      })
    );
  }),
  rest.delete('/api/items/:id', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ message: 'Item deleted successfully', id: Number(req.params.id) }));
  })
);

// Setup and teardown for the mock server
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('App Component', () => {
  test('renders the header', async () => {
    await act(async () => {
      render(<App />);
    });
    expect(screen.getByRole('heading', { name: 'To Do App' })).toBeInTheDocument();
    expect(screen.getByText('Keep track of your tasks')).toBeInTheDocument();
  });

  test('loads and displays items', async () => {
    await act(async () => {
      render(<App />);
    });
    
    // Initially shows loading state
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
    
    // Wait for items to load
    await waitFor(() => {
      expect(screen.getByText('Zulu Task')).toBeInTheDocument();
      expect(screen.getByText('Alpha Task')).toBeInTheDocument();
      expect(screen.getByText('Due: 2026-04-01')).toBeInTheDocument();
      expect(screen.getByText('Due: Not set')).toBeInTheDocument();
    });
  });

  test('adds a new item with due date', async () => {
    const user = userEvent.setup();
    
    await act(async () => {
      render(<App />);
    });
    
    // Wait for items to load
    await waitFor(() => {
      expect(screen.queryByText('Loading data...')).not.toBeInTheDocument();
    });
    
    // Fill in the form and submit
    const input = screen.getByRole('textbox', { name: /Task name/i });
    const dueDateInput = screen.getByLabelText(/Due date/i);

    await act(async () => {
      await user.type(input, 'New Test Item');
      await user.type(dueDateInput, '2026-12-31');
    });
    
    const submitButton = screen.getByRole('button', { name: 'Add Item' });
    await act(async () => {
      await user.click(submitButton);
    });
    
    // Check that the new item appears
    await waitFor(() => {
      expect(screen.getByText('New Test Item')).toBeInTheDocument();
      expect(screen.getByText('Due: 2026-12-31')).toBeInTheDocument();
    });
  });

  test('keeps items sorted in reverse alphabetical order after add', async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading data...')).not.toBeInTheDocument();
    });

    await act(async () => {
      await user.type(screen.getByRole('textbox', { name: /Task name/i }), 'Bravo Task');
      await user.click(screen.getByRole('button', { name: 'Add Item' }));
    });

    await waitFor(() => {
      const taskNames = screen
        .getAllByRole('listitem')
        .map((item) => item.textContent)
        .join(' ');

      expect(taskNames.indexOf('Zulu Task')).toBeLessThan(taskNames.indexOf('Bravo Task'));
      expect(taskNames.indexOf('Bravo Task')).toBeLessThan(taskNames.indexOf('Alpha Task'));
    });
  });

  test('handles API error', async () => {
    // Override the default handler to simulate an error
    server.use(
      rest.get('/api/items', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );
    
    await act(async () => {
      render(<App />);
    });
    
    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch data/)).toBeInTheDocument();
    });
  });

  test('shows empty state when no items', async () => {
    // Override the default handler to return empty array
    server.use(
      rest.get('/api/items', (req, res, ctx) => {
        return res(ctx.status(200), ctx.json([]));
      })
    );
    
    await act(async () => {
      render(<App />);
    });
    
    // Wait for empty state message
    await waitFor(() => {
      expect(screen.getByText('No items found. Add some!')).toBeInTheDocument();
    });
  });
});