import React, { useState} from 'react';
import {connect, Provider} from "react-redux";
import {compose} from 'redux';
import {BrowserRouter, Route, Routes} from 'react-router-dom'
import Main from './Components/Main/Main'
import { AuthProvider } from './context/AuthContext';
import LoginPage from './Components/Login/LoginPage'
import Header from './Components/Header/Header'
import Footer from './Components/Footer/Footer'


function FrontApp() {
    return (<BrowserRouter>
                <AuthProvider>
                <div>
                    <Header/>
                    <div class='body'>
                        <Routes>
                            <Route exact={true} path={"/"} element={<Main/>}/>
                            <Route element={<LoginPage/>} path="/login"/>
                         </Routes>
                    </div>
                    <Footer/>
                </div>
                </AuthProvider>
            </BrowserRouter>
            )

}

export default FrontApp;