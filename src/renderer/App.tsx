import React from 'react';
import { Outlet } from 'react-router-dom';
import styled from 'styled-components';
import Sidebar from './components/Sidebar/Sidebar';
const Container = styled.div`
  display: flex;
  align-items: stretch;
  height: 100vh;
`;

const App: React.FC = () => {
  return (
    <Container>
      <Sidebar />
      <div style={{ display: 'flex', flex: 4 }}>
        <Outlet />
      </div>
    </Container>
  );
};

export default App;
