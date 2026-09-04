import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ItemForm } from './components/ItemForm';
import { ItemList, type Item } from './components/ItemList';
import { PostgresGuide } from './components/PostgresGuide';

export function App() {
  const [serverOnline, setServerOnline] = useState(false);
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; message: string; details?: any } | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [dataSource, setDataSource] = useState<string>('checking');
  const [loading, setLoading] = useState(true);

  const fetchHealthAndData = async () => {
    setLoading(true);
    try {
      // Health Check
      const healthRes = await fetch('/api/health');
      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setServerOnline(true);
        setDbStatus(healthData.database);
      } else {
        setServerOnline(false);
      }

      // Fetch Items
      const itemsRes = await fetch('/api/items');
      if (itemsRes.ok) {
        const itemsData = await itemsRes.json();
        setItems(itemsData.items || []);
        setDataSource(itemsData.source || 'unknown');
      }
    } catch (error) {
      console.error('Error connecting to Express server:', error);
      setServerOnline(false);
      setDbStatus(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthAndData();
  }, []);

  const handleAddItem = async (newItemData: { title: string; description: string; amount: number; category: string }) => {
    try {
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItemData),
      });

      if (response.ok) {
        await fetchHealthAndData();
      }
    } catch (error) {
      console.error('Failed to create item:', error);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const response = await fetch(`/api/items/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setItems((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  return (
    <div className="container">
      <Header
        serverOnline={serverOnline}
        dbStatus={dbStatus}
        onRefresh={fetchHealthAndData}
      />

      <PostgresGuide dbConnected={!!dbStatus?.connected} />

      <main className="dashboard-grid">
        <section>
          <ItemForm onAddItem={handleAddItem} />
        </section>

        <section>
          {loading ? (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
              <p className="title-desc">Connecting to Express API backend...</p>
            </div>
          ) : (
            <ItemList
              items={items}
              dataSource={dataSource}
              onDeleteItem={handleDeleteItem}
            />
          )}
        </section>
      </main>

      <footer style={{ marginTop: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        Finatle Full-Stack Template • React 18 + Node.js Express + PostgreSQL (pg & Prisma)
      </footer>
    </div>
  );
}

export default App;
