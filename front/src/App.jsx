import React, { useState} from 'react';
import {connect, Provider} from "react-redux";
import {compose} from 'redux';
import {BrowserRouter, Route, Routes} from 'react-router-dom'
import Main from './Components/Main/Main'
import { AuthProvider } from './context/AuthContext';
import LoginPage from './Components/Login/LoginPage'
import Header from './Components/Header/Header'
import Footer from './Components/Footer/Footer'
import GroupChat from './Components/Chat/GroupChat'
import StudentChat from './Components/Chat/StudentChat'
import { ProtectedRoute } from './Components/ProtectedRoute'
import NewsPage from './Components/News/NewsPage'
import AnnouncementsPage from './Components/Announcemet/AnnouncementsPage'


function FrontApp() {
    return (<BrowserRouter>
                <AuthProvider>
                <div>
                    <Header/>
                    <div class='body'>
                        <Routes>
                            <Route exact={true} path={"/"} element={<Main/>}/>
                            <Route element={<LoginPage/>} path="/login"/>
                            <Route element={<AnnouncementsPage/>} path="/AnnouncementsPage"/>
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
                </AuthProvider>
            </BrowserRouter>
            )

}

export default FrontApp;