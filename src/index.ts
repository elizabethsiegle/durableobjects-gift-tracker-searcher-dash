import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { GiftSchema } from './durable-objects/GiftListStore';
import * as ExaModule from "exa-js";
const Exa = ExaModule.default;

interface Env {
  GIFT_LIST_STORE: DurableObjectNamespace;
  EXA_API_KEY: string;
}

export { GiftListStore } from './durable-objects/GiftListStore';

const css = `
  body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background-color: #2f8c3c;
    margin: 0;
    padding: 20px;
  }

  h1 {
    text-align: center;
    color: white;
    font-size: 2.5em;
    margin: 20px 0 40px 0;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
    font-family: 'Arial Rounded MT Bold', 'Helvetica Rounded', Arial, sans-serif;
  }

  .form-title {
    text-align: center;
    color: #d42426;
    font-size: 1.5em;
    margin: 0 0 20px 0;
    font-weight: bold;
  }

  .container {
    max-width: 500px;
    margin: 0 auto;
    background: white;
    padding: 30px;
    border-radius: 10px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
  }

  input {
    width: 250px;
    padding: 12px;
    margin: 8px auto;
    display: block;
    border: 2px solid #ddd;
    border-radius: 6px;
    font-size: 16px;
    text-align: center;
  }

  input:focus {
    outline: none;
    border-color: #d42426;
  }

  button {
    width: auto;
    padding: 10px 20px;
    margin: 10px auto;
    display: block;
    background-color: #d42426;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 16px;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  button:hover {
    background-color: #b71c1c;
    transform: scale(1.05);
  }

  .gift-list {
    width: 80%;
    margin: 20px auto;
    padding: 0;
    list-style: none;
  }

  .gift-item {
    padding: 15px;
    margin: 10px 0;
    background-color: #f8f9fa;
    border-radius: 6px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border: 2px solid #2f8c3c;
    position: relative;
  }

  .gift-item:before {
    content: "🎁";
    margin-right: 10px;
  }

  .gift-item:nth-child(even):before {
    content: "🎄";
  }

  .gift-item:hover {
    background-color: #f1f1f1;
    transform: translateX(5px);
    transition: transform 0.2s ease;
  }

  .gift-item::after {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    left: 50%;
    width: 1px;
    background-color: #ddd;
  }

  .gift-item-content {
    flex: 1;
    padding: 0 10px;
    text-align: center;
  }
    table {
    width: 100%;
    border-collapse: collapse;
    margin: 20px 0;
  }

  th, td {
    border: 1px solid #ddd;
    padding: 12px;
    text-align: center;
  }

  th {
    background-color: #d42426;
    color: white;
    font-weight: bold;
  }

  tr:nth-child(even) {
    background-color: #f2f2f2;
  }

  tr:hover {
    background-color: #e0e0e0;
  }
    /* Add these new styles */
  .gift-row {
    position: relative;
    transition: transform 0.3s ease;
    touch-action: pan-y pinch-zoom;
  }

  .gift-row.swiping {
    cursor: grabbing;
  }

  .gift-row.removing {
    transform: translateX(-100%);
    opacity: 0;
  }

  .delete-indicator {
    position: absolute;
    right: 0;
    top: 0;
    height: 100%;
    width: 0;
    background-color: #e74c3c;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    overflow: hidden;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .delete-indicator.visible {
    opacity: 1;
  }

  .delete-indicator::after {
    content: '🗑️';
    padding-right: 20px;
    color: white;
    font-size: 20px;
  }
`;

const app = new Hono<{ Bindings: Env }>();
// Middleware to get or create Durable Object instance
const getGiftListStore = (c: any) => {
  const id = c.env.GIFT_LIST_STORE.idFromName('gift-list-store');
  return c.env.GIFT_LIST_STORE.get(id);
};
// Get all gift items
app.get('/gifts', async (c) => {
  const store = getGiftListStore(c);
  const newRequest = new Request(c.req.url, {
    method: c.req.method,
    headers: c.req.header()
  });
  return store.fetch(newRequest);
});
// Add a new gift item
app.post('/gifts', zValidator('json', GiftSchema), async (c) => {
const store = getGiftListStore(c);
const body = await c.req.json();
const newRequest = new Request(c.req.url, {
  method: c.req.method,
  headers: c.req.header(),
  body: JSON.stringify(body)
});
const response = await store.fetch(newRequest);
  return response;
});
// Update a gift item
app.put('/gifts/:id', zValidator('json', GiftSchema), async (c) => {
  const store = getGiftListStore(c);
  const body = await c.req.json();
  const newRequest = new Request(c.req.url, {
  method: c.req.method,
  headers: c.req.header(),
  body: JSON.stringify(body)
});
const response = await store.fetch(newRequest);
  return response;
});
// Delete a gift item
app.delete('/gifts/:id', async (c) => {
  const store = getGiftListStore(c);
  const newRequest = new Request(c.req.url, {
  method: c.req.method,
  headers: c.req.header()
});
const response = await store.fetch(newRequest);
  return response;
});
// Add this near your other endpoints
app.get('/search/:query', async (c) => {
  const query = c.req.param('query');
  
  if (!c.env.EXA_API_KEY) {
    return c.json({ error: 'Missing API key' }, 500);
  }
  
  try {
    const exa = new Exa(c.env.EXA_API_KEY);
    const result = await exa.search(query, {
      numResults: 3
    });
    console.log(`result ${JSON.stringify(result, null, 2)}`);
    // Transform the response to match what your frontend expects
    return c.json({
      result
    });
    
  } catch (error) {
    console.error('Search error:', error);
    return c.json({ 
      error: 'Search failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});
// Serve a simple HTML interface
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Gift List</title>
      <style>
      ${css}
      </style>
      <script>
        // Define searchGifts first, before any HTML that uses it
        async function searchGifts() {
          const query = document.getElementById('searchQuery').value.trim();
          const searchResults = document.getElementById('searchResults');
          
          searchResults.innerHTML = '<div>Searching...</div>';
          
          try {
            const response = await fetch('/search/' + query);
            const data = await response.json();
            
            if (!response.ok) {
              throw new Error(data.details || data.error || 'Search failed');
            }
            
            if (!data.documents || data.documents.length === 0) {
              searchResults.innerHTML = '<div>No results found</div>';
              return;
            }
            
            searchResults.innerHTML = data.documents.map(doc => \`
              <div style="margin: 10px 0; padding: 10px; background: #f5f5f5; border-radius: 5px;">
                <div>\${doc.summary || doc.text || 'No content available'}</div>
                \${doc.url ? \`<a href="\${doc.url}" target="_blank" style="color: #d42426;">Learn More</a>\` : ''}
              </div>
            \`).join('');
          } catch (error) {
            console.error('Search error:', error);
            searchResults.innerHTML = \`<div style="color: red;">Error: \${error.message}</div>\`;
          }
        }

        async function addGift(event) {
          event.preventDefault();
          const recipient = document.getElementById('name').value;
          const gift = document.getElementById('gift').value;
          
          const row = document.createElement('tr');
          row.className = 'gift-row';
          row.innerHTML = \`
            <td>\${recipient}</td>
            <td>\${gift}</td>
            <td>No</td>
            <div class="delete-indicator"></div>
          \`;
          
          // Add touch event listeners
          row.addEventListener('touchstart', handleTouchStart);
          row.addEventListener('touchmove', handleTouchMove);
          row.addEventListener('touchend', handleTouchEnd);
          
          document.getElementById('giftList').appendChild(row);
          
          // Clear the form
          document.getElementById('name').value = '';
          document.getElementById('gift').value = '';
        }

        async function loadGifts() {
          const response = await fetch('/gifts');
          const gifts = await response.json();
          const list = document.getElementById('giftList');
          
          list.innerHTML = gifts.map(gift => \`
            <tr>
              <td>🎁 \${gift.name}</td>
              <td>\${gift.gift}</td>
              <td style="width: 100px"><input type="checkbox" \${gift.purchased ? 'checked' : ''} 
                  onclick="updateGift('\${gift.id}', this.checked)"></td>
              <td style="width: 50px"><button onclick="deleteGift('\${gift.id}')" 
                  style="background: transparent; color: #d42426; padding: 5px">❌</button></td>
            </tr>
          \`).join('');
        }

        async function updateGift(id, purchased) {
          const response = await fetch('/gifts');
          const gifts = await response.json();
          const gift = gifts.find(g => g.id === id);
          await fetch('/gifts/' + id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...gift, purchased })
          });
        }

        async function deleteGift(id) {
          await fetch('/gifts/' + id, {
            method: 'DELETE'
          });
          loadGifts(); // Refresh the list after deletion
        }

        // Load gifts when page loads
        document.addEventListener('DOMContentLoaded', loadGifts);
        document.addEventListener('DOMContentLoaded', function() {
        const searchButton = document.getElementById('searchButton');
        if (searchButton) {
          searchButton.addEventListener('click', searchGifts); // Direct reference to searchGifts function
        }
        loadGifts(); // Keep the initial load
      });
      </script>
      <style>
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
      </style>
    </head>
    <body>
    <h1>🎄 Holiday Gift List 🎁</h1>
    <div class="container">
      <div class="form-title"> Add a Gift to Your List ✨</div>
      <form onsubmit="addGift(event)">
        <input id="name" placeholder="Recipient Name" required>
        <input id="gift" placeholder="Gift Description" required>
        <button type="submit">Add Gift</button>
      </form>
      <div class="form-title" style="margin-top: 20px;">🔍 Search for Gift Ideas</div>
      <div style="display: flex; justify-content: center; gap: 10px;">
        <input 
          id="searchQuery" 
          name="searchQuery"
          autocomplete="off"
          placeholder="Search for gift ideas..."
        >
        <button 
          id="searchButton" 
          name="searchButton"
          type="button"
        >Search</button>
      </div>
      <div id="searchResults" style="margin-top: 15px;"></div>
      <table>
        <thead>
          <tr>
            <th>Recipient</th>
            <th>Gift</th>
            <th style="width: 100px">Purchased</th>
            <th style="width: 50px"></th>
          </tr>
        </thead>
        <tbody id="giftList"></tbody>
      </table>
      </div>
    <script>
      function addGift(recipient, gift, purchased) {
        const row = document.createElement('tr');
        row.className = 'gift-row';
        row.innerHTML = \`
          <td>\${recipient}</td>
          <td>\${gift}</td>
          <td>\${purchased ? 'Yes' : 'No'}</td>
          <div class="delete-indicator"></div>
        \`;
        
        giftList.appendChild(row);
      }
      document.addEventListener('DOMContentLoaded', function() {
        console.log('DOM Content Loaded');
        const searchButton = document.getElementById('searchButton');
        console.log('Search button element:', searchButton);
        if (searchButton) {
          searchButton.addEventListener('click', function() {
            alert('Button clicked!');
            console.log('Button clicked');
          });
        }
      });
    </body>
    </html>
  `);
});
export default app;