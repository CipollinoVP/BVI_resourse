// App.jsx или страница с новостями
import React from 'react';
import NewsList from './NewsList';

const NewsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <NewsList />
    </div>
  );
};

export default NewsPage;