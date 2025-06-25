import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './App.css';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

function App() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [searchTerm] = useState("");

  // Google Calendar ID for Virtuals Protocol
  const CALENDAR_ID = '8d9e7d11d17a0102c0beca1c071b76e993181a48aa46194173fd4739d7423f5c@group.calendar.google.com';
  
  // Activity types we're tracking
  const ACTIVITY_TYPES = ['Launch', 'Unstake', 'Sell'];

  const fetchCalendarEvents = useCallback(async () => {
    try {
      setLoading(true);
      
      // For public calendars, we can use a simple fetch approach
      // Note: This is a simplified approach. For production, you'd want to use the Google Calendar API with proper authentication
      const now = new Date();
      const oneMonthFromNow = new Date();
      oneMonthFromNow.setMonth(now.getMonth() + 1);
      
      // Use a different CORS proxy (AllOrigins) to fetch the .ics file
      const url = `https://api.allorigins.win/raw?url=https://calendar.google.com/calendar/ical/${CALENDAR_ID}/public/basic.ics`;
      
      const response = await axios.get(url);
      // Debug: log the first 500 characters of the raw .ics data
      console.log('Raw .ics data:', response.data.slice(0, 500));
      const events = parseICalData(response.data);
      
      // Debug: log all event summaries
      console.log('All parsed event summaries:', events.map(e => e.summary));
      
      // Filter events by activity types
      const filteredEvents = events.filter(event => 
        ACTIVITY_TYPES.some(type => 
          event.summary && event.summary.toLowerCase().includes(type.toLowerCase())
        )
      );
      // Only show upcoming events (today or later)
      const today = new Date();
      today.setHours(0,0,0,0);
      const upcomingEvents = filteredEvents.filter(event => {
        if (event.allDay) {
          // Compare as YYYY-MM-DD
          return new Date(event.start + 'T00:00:00') >= today;
        } else {
          return new Date(event.start) >= today;
        }
      });
      // Sort by date ascending
      upcomingEvents.sort((a, b) => {
        const dateA = a.allDay ? new Date(a.start + 'T00:00:00') : new Date(a.start);
        const dateB = b.allDay ? new Date(b.start + 'T00:00:00') : new Date(b.start);
        return dateA - dateB;
      });
      setEvents(upcomingEvents);
    } catch (err) {
      setError('Failed to fetch calendar events. Please try again later.');
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  }, [CALENDAR_ID, ACTIVITY_TYPES]);

  useEffect(() => {
    fetchCalendarEvents();
  }, [fetchCalendarEvents]);

  const parseICalData = (icalData) => {
    const events = [];
    const lines = icalData.split(/\r?\n/);
    let currentEvent = {};
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.startsWith('BEGIN:VEVENT')) {
        currentEvent = {};
      } else if (line.startsWith('END:VEVENT')) {
        if (currentEvent.summary) {
          events.push(currentEvent);
        }
      } else if (line.startsWith('SUMMARY:')) {
        currentEvent.summary = line.substring(8);
      } else if (line.startsWith('DTSTART')) {
        let isAllDay = line.includes(';VALUE=DATE');
        let dateStr = line.split(':')[1];
        console.log('Raw dateStr:', dateStr);
        if (!dateStr) continue;
        dateStr = dateStr.replace(/Z$/, '').trim();
        console.log('Trimmed dateStr:', dateStr);
        if (/^\d{8}$/.test(dateStr)) {
          // All-day event: store as string
          const cleanDate = (dateStr.substr(0,4) + '-' + dateStr.substr(4,2) + '-' + dateStr.substr(6,2));
          currentEvent.start = cleanDate;
          currentEvent.allDay = true;
          console.log('parseICalData all-day:', currentEvent.start, currentEvent.allDay);
        } else if (/^\d{8}T\d{6}$/.test(dateStr)) {
          // Timed event: store as Date
          currentEvent.start = new Date(dateStr.substr(0,4) + '-' + dateStr.substr(4,2) + '-' + dateStr.substr(6,2) + 'T' + dateStr.substr(9,2) + ':' + dateStr.substr(11,2) + ':' + dateStr.substr(13,2));
          currentEvent.allDay = false;
        } else if (/^\d{8}T\d{6}/.test(dateStr)) {
          currentEvent.start = new Date(dateStr.substr(0,4) + '-' + dateStr.substr(4,2) + '-' + dateStr.substr(6,2) + 'T' + dateStr.substr(9,2) + ':' + dateStr.substr(11,2) + ':' + dateStr.substr(13,2));
          currentEvent.allDay = false;
        } else {
          currentEvent.start = new Date(dateStr);
          currentEvent.allDay = isAllDay;
        }
      } else if (line.startsWith('DESCRIPTION:')) {
        currentEvent.description = line.substring(12);
      }
    }
    
    return events.sort((a, b) => a.start - b.start);
  };

  const getActivityType = (summary) => {
    const lowerSummary = summary.toLowerCase();
    if (lowerSummary.includes('launch')) return 'Launch';
    if (lowerSummary.includes('unstake')) return 'Unstake';
    if (lowerSummary.includes('sell')) return 'Sell';
    return 'Other';
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'Launch': return '#4CAF50';
      case 'Unstake': return '#FF9800';
      case 'Sell': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const formatDate = (date, allDay) => {
    // Debug: log the date and allDay flag before formatting
    console.log('Formatting date:', date, 'allDay:', allDay);
    if (allDay) {
      const testDate = new Date(date + 'T00:00:00');
      console.log('All-day event, testDate:', testDate, 'isNaN:', isNaN(testDate));
      return testDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } else {
      return new Date(date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  // Filter events by search term
  const filteredEvents = events.filter(event =>
    event.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (event.start && formatDate(event.start, event.allDay).toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Next 3–5 upcoming events for the widget
  const nextEvents = filteredEvents.slice(0, 5);

  // Filtered event dates for calendar highlighting
  const filteredEventDates = filteredEvents.map(event => event.allDay ? event.start : (new Date(event.start).toISOString().slice(0,10)));

  if (loading) {
    return (
      <div className="App">
        <div className="loading">
          <h2>Loading Virtual Agent Unlocks...</h2>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="App">
        <div className="error">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={fetchCalendarEvents}>Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Virtual Agent Unlocks</h1>
        <p>Tracking Launches, Unstakes, and Sells</p>
        <a 
          href="https://app.virtuals.io/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="virtuals-link"
        >
          Visit Virtuals Protocol
        </a>
      </header>

      <main className="App-main">
        <div className="stats">
          <div className="stat-card">
            <h3>Total Activities</h3>
            <span className="stat-number">{events.length}</span>
          </div>
          <div className="stat-card">
            <h3>Launches</h3>
            <span className="stat-number">{events.filter(e => getActivityType(e.summary) === 'Launch').length}</span>
          </div>
          <div className="stat-card">
            <h3>Unstakes</h3>
            <span className="stat-number">{events.filter(e => getActivityType(e.summary) === 'Unstake').length}</span>
          </div>
          <div className="stat-card">
            <h3>Sells</h3>
            <span className="stat-number">{events.filter(e => getActivityType(e.summary) === 'Sell').length}</span>
          </div>
        </div>

        {/* Calendar and Next Events Side by Side */}
        <div className="calendar-next-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'center', alignItems: 'flex-start' }}>
          <div className="calendar-container" style={{ flex: '1 1 350px', minWidth: 320, maxWidth: 600 }}>
            <h2>Calendar View</h2>
            <Calendar
              onChange={date => setSelectedDate(date.toISOString().slice(0,10))}
              value={selectedDate ? new Date(selectedDate) : undefined}
              tileClassName={({ date, view }) => {
                const dateString = date.toISOString().slice(0,10);
                return filteredEventDates.includes(dateString) ? 'has-event' : null;
              }}
            />
            {/* Subscribe to Calendar Button */}
            <a
              href="https://calendar.google.com/calendar/ical/8d9e7d11d17a0102c0beca1c071b76e993181a48aa46194173fd4739d7423f5c@group.calendar.google.com/public/basic.ics"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                marginTop: '1.5rem',
                padding: '0.75rem 1.5rem',
                borderRadius: '20px',
                background: '#18181b',
                color: '#fff',
                fontWeight: 700,
                textDecoration: 'none',
                fontSize: '1rem',
                border: 'none',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                transition: 'background 0.2s',
              }}
            >
              📅 Subscribe to Calendar
            </a>
            {selectedDate && (
              <div className="selected-events">
                <h3>Events on {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US')}</h3>
                {filteredEvents.filter(event => {
                  const eventDate = event.allDay ? event.start : (new Date(event.start).toISOString().slice(0,10));
                  return eventDate === selectedDate;
                }).length === 0 ? (
                  <p>No events for this day.</p>
                ) : (
                  <ul>
                    {filteredEvents.filter(event => {
                      const eventDate = event.allDay ? event.start : (new Date(event.start).toISOString().slice(0,10));
                      return eventDate === selectedDate;
                    }).map((event, idx) => (
                      <li key={idx}>{event.summary}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          {/* Compact Upcoming Events Widget */}
          <div className="next-events-widget">
            <h3 style={{ margin: '0 0 1rem 0', color: '#a3e635', fontWeight: 700 }}>Next Events</h3>
            {nextEvents.length === 0 ? (
              <p style={{ color: '#f4f4f5', opacity: 0.7 }}>No upcoming events.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {nextEvents.map((event, idx) => (
                  <li key={idx} style={{ marginBottom: '0.75rem', color: '#f4f4f5' }}>
                    <span style={{ fontWeight: 600 }}>{event.summary}</span>
                    <br />
                    <span style={{ fontSize: '0.95rem', opacity: 0.8 }}>{formatDate(event.start, event.allDay)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="events-container">
          <h2>Upcoming Activities</h2>
          {events.length === 0 ? (
            <div className="no-events">
              <p>No activities found in the calendar.</p>
              <p>Check the <a href="https://calendar.google.com/calendar/u/1?cid=OGQ5ZTdkMTFkMTdhMDEwMmMwYmVjYTFjMDcxYjc2ZTk5MzE4MWE0OGFhNDYxOTQxNzNmZDQ3MzlkNzQyM2Y1Y0Bncm91cC5jYWxlbmRhci5nb29nbGUuY29t" target="_blank" rel="noopener noreferrer">Google Calendar</a> for updates.</p>
            </div>
          ) : (
            <div className="events-list">
              {events.map((event, index) => {
                const activityType = getActivityType(event.summary);
                return (
                  <div key={index} className="event-card" style={{ borderLeftColor: getActivityColor(activityType) }}>
                    <div className="event-header">
                      <span className="activity-type" style={{ backgroundColor: getActivityColor(activityType) }}>
                        {activityType}
                      </span>
                      <span className="event-date">{formatDate(event.start, event.allDay)}</span>
                    </div>
                    <h3 className="event-title">{event.summary}</h3>
                    {event.description && (
                      <p className="event-description">{event.description}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="refresh-section">
          <button onClick={fetchCalendarEvents} className="refresh-button">
            🔄 Refresh Activities
          </button>
        </div>
      </main>
    </div>
  );
}

export default App;
