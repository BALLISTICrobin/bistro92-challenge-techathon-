'use client';

import { useState, useEffect } from 'react';

type Order = {
  order_id: number;
  table_number: string;
  items: string;
  created_at: string;
};

export default function Home() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      const response = await fetch('https://bistro-92backend.onrender.com/api/orders');
      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.status}`);
      }
      const data = await response.json();
      setOrders(data.orders);
      setError(null);
    } catch (err) {
      setError('Error fetching orders');
      console.error(err);
    }
  };

  useEffect(() => {
    fetchOrders(); // Initial fetch
    const interval = setInterval(fetchOrders, 5000); // Poll every 5 seconds
    return () => clearInterval(interval); // Cleanup
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Bistro 92 Manager Dashboard</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-4 border">Order ID</th>
              <th className="py-2 px-4 border">Table</th>
              <th className="py-2 px-4 border">Items</th>
              <th className="py-2 px-4 border">Created At</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-2 px-4 text-center">
                  No orders found
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.order_id} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border">{order.order_id}</td>
                  <td className="py-2 px-4 border">{order.table_number}</td>
                  <td className="py-2 px-4 border">{order.items}</td>
                  <td className="py-2 px-4 border">
                    {new Date(order.created_at).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}