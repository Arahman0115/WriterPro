// App.js
import React from 'react';

import './global.css'
import WriterPage from './Writer';
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { AuthProvider } from './AuthContext';
import HomePage from './Homepage';
import LogInPage from './loginpage';
import LandingPage from './LandingPage';
import SettingsPage from './SettingsPage';
import DemoPage from './DemoPage';
import Research from './Research';
import ResearchCross from './ResearchCross';
import { AnimatePresence, motion } from 'framer-motion';
import GeneralSearch from './GeneralSearch';
import SemanticSearch from './SemanticSearch';
import Summarize from './Summarize';
import FigureExplanation from './FigureExplanation';
const pageVariants = {
  initial: {
    opacity: 0, // Start fully transparent
  },
  in: {
    opacity: 1, // Fade in to fully opaque
  },
  out: {
    opacity: 0, // Fade out to fully transparent
  }
};

const pageTransition = {
  type: "tween",
  duration: 0.2, // Shorter duration for a quick blink effect
};

const AnimatedRoute = ({ children }) => (
  <motion.div
    initial="initial"
    animate="in"
    exit="out"
    variants={pageVariants}
    transition={pageTransition}
  >
    {children}
  </motion.div>
);

const App = () => {
  const { currentUser } = useAuth();
  const location = useLocation();

  return (
    <AuthProvider>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={
            <AnimatedRoute>
              {currentUser ? <Navigate to="/Homepage" /> : <LandingPage />}
            </AnimatedRoute>
          } />
          <Route path="/login" element={<AnimatedRoute><LogInPage /></AnimatedRoute>} />
          <Route path="/writer" element={<AnimatedRoute><WriterPage /></AnimatedRoute>} />
          <Route path="/settings" element={<AnimatedRoute><SettingsPage /></AnimatedRoute>} />
          <Route path="/research" element={<AnimatedRoute><Research /></AnimatedRoute>} />
          <Route path="/general-search" element={<AnimatedRoute><GeneralSearch /></AnimatedRoute>} />
          <Route path="/research-cross" element={<AnimatedRoute><ResearchCross /></AnimatedRoute>} />
          <Route path="/semantic-search" element={<AnimatedRoute><SemanticSearch /></AnimatedRoute>} />
          <Route path="/summarize" element={<AnimatedRoute><Summarize /></AnimatedRoute>} />
          <Route path="/figure-explanation" element={<AnimatedRoute><FigureExplanation /></AnimatedRoute>} />
          <Route path="/demo" element={<AnimatedRoute><DemoPage /></AnimatedRoute>} />
          <Route path="/Homepage" element={
            <AnimatedRoute>
              {currentUser ? <HomePage /> : <Navigate to="/" />}
            </AnimatedRoute>
          } />
        </Routes>
      </AnimatePresence>
    </AuthProvider>
  );
};

const AppWrapper = () => (
  <Router>
    <App />
  </Router>
);

export default AppWrapper;
