import React from 'react';

function SeatMap({ occupiedSeats, selectedSeats, onSeatClick }) {
  const totalRows = 10;
  const columnsLeft = ['A', 'B'];
  const columnsRight = ['C', 'D'];

  const getSeatStatus = (seatId) => {
    if (occupiedSeats.includes(seatId)) return 'booked';
    if (selectedSeats.includes(seatId)) return 'selected';
    return 'available';
  };

  const getSeatStyle = (status) => {
    const baseStyle = {
      width: '44px',
      height: '44px',
      borderRadius: '8px',
      fontSize: '13px',
      fontWeight: '700',
      cursor: status === 'booked' ? 'not-allowed' : 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.15s ease',
      boxSizing: 'border-box',
      outline: 'none'
    };

    switch (status) {
      case 'booked':
        return { 
          ...baseStyle, 
          backgroundColor: '#f1f5f9', 
          color: '#94a3b8', 
          border: '1px solid #e2e8f0' 
        };
      case 'selected':
        return { 
          ...baseStyle, 
          backgroundColor: '#0052cc', 
          color: '#ffffff', 
          border: '1px solid #0052cc',
          boxShadow: '0 4px 10px rgba(0, 82, 204, 0.3)'
        };
      case 'available':
      default:
        return { 
          ...baseStyle, 
          backgroundColor: '#ffffff', 
          color: '#0f172a', 
          border: '2px solid #cbd5e1' 
        };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', fontFamily: 'sans-serif' }}>
      
      {/* Visual Indicator Legend */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '32px', flexWrap: 'wrap', justifyContent: 'center', fontSize: '13px', fontWeight: '600', color: '#64748b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '16px', height: '16px', borderRadius: '4px', border: '2px solid #cbd5e1', backgroundColor: '#ffffff' }}></div> Available
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '16px', height: '16px', borderRadius: '4px', backgroundColor: '#0052cc' }}></div> Selected
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '16px', height: '16px', borderRadius: '4px', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0' }}></div> Booked
        </div>
      </div>

      {/* Driver / Front of Bus Indicator */}
      <div style={{ width: '100%', maxWidth: '280px', display: 'flex', justifyContent: 'flex-end', marginBottom: '16px', paddingRight: '20px', color: '#94a3b8', fontSize: '24px' }}>
        ⎈
      </div>

      {/* Main Seating Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {Array.from({ length: totalRows }).map((_, rowIndex) => {
          const rowNum = rowIndex + 1;
          
          return (
            <div key={rowNum} style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              
              {/* Left Column (Window & Aisle) */}
              <div style={{ display: 'flex', gap: '12px' }}>
                {columnsLeft.map(col => {
                  const seatId = `L-${rowNum}${col}`;
                  const status = getSeatStatus(seatId);
                  return (
                    <button 
                      key={seatId} 
                      disabled={status === 'booked'} 
                      onClick={() => onSeatClick(seatId)} 
                      style={getSeatStyle(status)}
                    >
                      {rowNum}{col}
                    </button>
                  );
                })}
              </div>

              {/* Center Aisle Spacer */}
              <div style={{ width: '20px' }}></div>

              {/* Right Column (Aisle & Window) */}
              <div style={{ display: 'flex', gap: '12px' }}>
                {columnsRight.map(col => {
                  const seatId = `R-${rowNum}${col}`;
                  const status = getSeatStatus(seatId);
                  return (
                    <button 
                      key={seatId} 
                      disabled={status === 'booked'} 
                      onClick={() => onSeatClick(seatId)} 
                      style={getSeatStyle(status)}
                    >
                      {rowNum}{col}
                    </button>
                  );
                })}
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SeatMap;