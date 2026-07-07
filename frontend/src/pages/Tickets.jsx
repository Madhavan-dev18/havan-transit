
function Tickets({ bookings, onDownload }) {
  return (
    <div style={{ padding: '20px', boxSizing: 'border-box', fontFamily: 'sans-serif', color: '#0f172a' }}>
      
      {/* Page Header */}
      <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '2px solid #e2e8f0' }}>
        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: '#0f172a' }}>Your Booking Ledger</h2>
        <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#64748b' }}>Manage your active reservations and download PDF boarding passes.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {bookings.length === 0 ? (
          /* Empty State Display */
          <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
            <span style={{ fontSize: '32px', display: 'block', marginBottom: '12px' }}>🎫</span>
            <h3 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '18px' }}>No Active Bookings</h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>You haven't reserved any seats yet. Head to the dashboard to find a bus.</p>
          </div>
        ) : (
          /* Ledger Cards */
          bookings.map((booking) => (
            <div 
              key={booking.id} 
              style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '24px', 
                backgroundColor: '#ffffff', 
                borderRadius: '12px', 
                border: '1px solid #e2e8f0',
                borderLeft: '6px solid #16a34a',
                gap: '20px'
              }}
            >
              {/* Left Side: Itinerary Data */}
              <div style={{ flex: '1 1 300px' }}>
                <span style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace', display: 'block', marginBottom: '6px', fontWeight: '600', letterSpacing: '0.5px' }}>
                  UUID: {booking.ticket_id}
                </span>
                <h4 style={{ margin: '0 0 12px 0', color: '#0f172a', fontSize: '18px', fontWeight: '700' }}>
                  Bus Route Identifier: #{booking.bus}
                </h4>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
                  <span style={{ 
                    padding: '4px 10px', 
                    borderRadius: '6px', 
                    backgroundColor: booking.status === 'CONFIRMED' ? '#dcfce7' : '#fef9c3', 
                    color: booking.status === 'CONFIRMED' ? '#166534' : '#854d0e', 
                    fontWeight: '700', 
                    fontSize: '12px' 
                  }}>
                    {booking.status}
                  </span>
                  <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>
                    Purchased: {new Date(booking.booked_on).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Right Side: Financials & Execution Action */}
              <div style={{ flex: '1 1 200px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', color: '#0052cc', fontSize: '22px', fontWeight: '800' }}>₹{booking.total_price}</h3>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: '600' }}>
                    {booking.seats_booked} Passenger(s)
                  </p>
                </div>

                <button 
                  onClick={() => onDownload(booking.id, booking.ticket_id)}
                  style={{ 
                    padding: '12px 20px', 
                    backgroundColor: '#0052cc', 
                    color: '#ffffff', 
                    border: 'none', 
                    borderRadius: '8px', 
                    fontSize: '14px', 
                    fontWeight: '700', 
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#0043a4'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#0052cc'}
                >
                  ⇓ Download PDF
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Tickets;