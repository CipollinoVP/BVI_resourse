import React, { useState} from 'react';
import {connect, Provider} from "react-redux";
import {compose} from 'redux';
import {BrowserRouter, Route, Routes} from 'react-router-dom'
import Main from './Components/Main/Main'
import './App.css';
import LoginPage from './Components/Login/LoginPage'
import Header from './Components/Header/Header'
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './Components/ProtectedRoute'
import ClassMain from './Components/ClassEdit/ClassMain'
import AddParticipant from './Components/ClassEdit/AddParticipant'
import CreateClassPage from './Components/ClassEdit/CreateClassPage'
import EditClassPage from './Components/ClassEdit/EditClassPage'
import AnnouncementCreate from './Components/Announcement/AnnouncementCreate'
import CreateUser from './Components/CreateUser'
import GroupChat from './Components/Chat/GroupChat'
import TeacherChat from './Components/Chat/TeacherChat'
import ClassAnnouncementPage from './Components/ClassEdit/ClassAnnouncementPage'


function FrontApp() {
    const [styl, setStyle] = useState("App")

    return (<BrowserRouter>
              <AuthProvider>
                <div className={styl}>
                    <Header/>
                    <div class='body'>
                        <Routes>
                            <Route
                                path="/"
                                element={
                                    <ProtectedRoute>
                                        <Main />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/group/:id"
                                element={
                                    <ProtectedRoute>
                                        <ClassMain />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/announce/create"
                                element={
                                    <ProtectedRoute>
                                        <AnnouncementCreate />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/add_participant/:id"
                                element={
                                    <ProtectedRoute>
                                        <AddParticipant />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/edit_class/:id"
                                element={
                                    <ProtectedRoute>
                                        <EditClassPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/create_class"
                                element={
                                    <ProtectedRoute>
                                        <CreateClassPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/add_user"
                                element={
                                    <ProtectedRoute>
                                        <CreateUser />
                                    </ProtectedRoute>
                                }
                            />
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
                                        <TeacherChat />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/class_announce/:uuid"
                                element={
                                    <ProtectedRoute>
                                        <ClassAnnouncementPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route element={<LoginPage/>} path="/login"/>
                         </Routes>
                    </div>
                </div>
              </AuthProvider>
            </BrowserRouter>
            )

}

export default FrontApp;