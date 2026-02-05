import React from 'react';
import { Outlet } from 'react-router-dom';
import styled from 'styled-components';
import Sidebar from './components/Sidebar/Sidebar';
const Container = styled.div`
  display: flex;
  align-items: center;
  height: 100vh;
`;

const App: React.FC = () => {
  return (
    <Container>
      <Sidebar />
      <Outlet />
    </Container>
  );
};

export default App;
