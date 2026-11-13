import React, { useState} from 'react';
import {connect, Provider} from "react-redux";
import {compose} from 'redux';
import {BrowserRouter, Route, Routes} from 'react-router-dom'
import Main from './Components/Main/Main'
import { AuthProvider } from './context/AuthContext';
import { UnreadProvider } from './context/UnreadContext';
import LoginPage from './Components/Login/LoginPage'
import Header from './Components/Header/Header'
import Footer from './Components/Footer/Footer'
import GroupChat from './Components/Chat/GroupChat'
import StudentChat from './Components/Chat/StudentChat'
import { ProtectedRoute } from './Components/ProtectedRoute'
import NewsPage from './Components/News/NewsPage'
import AnnouncementsPage from './Components/Announcemet/AnnouncementsPage'
import DrawingsPage from './Components/Gallery/DrawingsPage'
import AboutPage from './Components/About/AboutPage'
import PhotosPage from './Components/Gallery/PhotosPage'


function FrontApp() {
    return (<BrowserRouter>
                <AuthProvider>
                <UnreadProvider>
                <div>
                    <Header/>
                    <div class='body'>
                        <Routes>
                            <Route exact={true} path={"/"} element={<Main/>}/>
                            <Route element={<LoginPage/>} path="/login"/>
                            <Route element={<AnnouncementsPage/>} path="/AnnouncementsPage"/>
                            <Route element={<AboutPage/>} path="/AboutPage"/>
                            <Route element={<DrawingsPage/>} path="/DrawingsPage"/>
                            <Route element={<PhotosPage/>} path="/PhotosPage"/>
                            <Route
                                path="/group_chat/:uuid"
                                element={
                                    <ProtectedRoute>
                                        <GroupChat />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/personal_chat/:uuid"
                                element={
                                    <ProtectedRoute>
                                        <StudentChat />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/NewsPage"
                                element={
                                    <ProtectedRoute>
                                        <NewsPage />
                                    </ProtectedRoute>
                                }
                            />
                         </Routes>
                    </div>
                    <Footer/>
                </div>
                </UnreadProvider>
                </AuthProvider>
            </BrowserRouter>
            )

}

export default FrontApp;