// const sass = require('sass');
import './CheckerBoard.css'
import React, { Component } from 'react'
import Tile from './Tile/Tile'
import pieces from '.././pieces'
import CurrentPlayer from './CurrentPlayer'
// import Notice from '../Notice/Notice'
import { w3cwebsocket as W3CWebSocket } from "websocket";
// const client = new W3CWebSocket(`ws://127.0.0.1:8001`); // production
const client = new W3CWebSocket(`ws://165.227.102.189:8002`); // build

class CheckerBoard extends Component {
    constructor() {
        super()

        this.state = {
            playerGood:{},
            playerBad:{},
            selectedPiece:{}, // 
            activeLocation:[null,null], // player selects tile
            pieces:[],
            matrix:[],
            setPermission:true,
            currentPlayer:'good',
            tileIsSelected:1,
            wasKillMade:false,
            chainKillData:{},
            chainKillAvailable:false,
            moveOptions:[],
        }
        this.selectTile = this.selectTile.bind(this)
        this.boardFactory = this.boardFactory.bind(this)
        this.getConnected = this.getConnected.bind(this)
        this.checkForKill = this.checkForKill.bind(this)
        this.sendToSocketsSwitch = this.sendToSocketsSwitch.bind(this)
        this.chainKills = this.chainKills.bind(this)
        this.setMoves = this.setMoves.bind(this)
        this.executeMovePiece = this.executeMovePiece.bind(this)
        this.killPiece = this.killPiece.bind(this)
        this.checkPieceLocations = this.checkPieceLocations.bind(this)
        this.switchPlayer = this.switchPlayer.bind(this)
        this.selectTile = this.selectTile.bind(this)
        this.unselectTile = this.unselectTile.bind(this)
        this.handleInput = this.handleInput.bind(this)
        // this.kingAll = this.kingAll.bind(this)

        // this.autoStartTurn = this.autoStartTurn.bind(this)
    }

    componentDidMount() {
        // console.log('is mounted',pieces)
        this.setState({pieces:pieces})
        this.boardFactory()
        this.getConnected()
    }

    getConnected = (input) => {
        client.onopen = () => {
            console.log('client connected')
        }
        client.onmessage = (message) => {
        
            const dataFromServer = JSON.parse(message.data);
            const { currentPlayer } = dataFromServer.input

            if (dataFromServer.type === 'checkerTurn' ) {
                this.setState({
                    pieces:dataFromServer.input.newPieces,
                    chainKillData:dataFromServer.input.chainKillData,
                    // currentPlayer:currentPlayer
                })
                // this.autoStartTurn() // for testing / pending removal
                this.switchPlayer(currentPlayer)
                if(this.state.chainKillAvailable === true){
                    if(this.state.chainKillData !== undefined){
                        
                        this.checkForKill(this.state.enemyX,this.state.enemyY,this.state.chainKillData)
                        this.setState({chainKillAvailable:false})
                    }
                } 
                else this.autoStartTurn()
                this.highLightFate()                
            }
        }
    }

        // --- this function makes all pieces king - it's purpose is strictly for testing moves in all direction --- //
    kingAll = () => {
        const { pieces } = this.state
        var updatePieces = []
        pieces.forEach(el => {
            el.isKing = true
            updatePieces.push(el)
        })
        this.setState({pieces:updatePieces})
        
    }

    sendToSocketsSwitch = (input) => {
        // console.log('hit sockets')
        client.send(JSON.stringify({type: "checkerTurn",input}))
    };

    boardFactory = () => {
    var matrix = []
    var numOfTiles = 8
    var M = Array.from(Array(numOfTiles)) // rows
    for(let i = 0; i < numOfTiles; i++){ // columns
    matrix.push(M)
        }
        this.setState({matrix:matrix})
    }

    // checks for available attacks of current play at biginning of each turn
    autoStartTurn = async () => {
        const { pieces,currentPlayer } = this.state
        this.handleInput('moveOptions',[])
    //     // var updatedPieces = [...pieces]
        var currentPieces = pieces.filter((el) => el.player === currentPlayer)
        var ememyPieces = pieces.filter((el) => el.player !== currentPlayer)
        currentPieces.forEach(el => {
            this.chainKills(el.x,el.y,pieces,[el],false)
        })
    }

    // checks for chain kills
    chainKills = async (x,y,updatedPieces,currentPiece,attack) => {
        // --- the "attack" parameter is a boolean used for checking whether or not an attack is available, without executing attack --- //
        // this.handleInput('moveOptions',[])
        const { matrix,moveOptions } = this.state
        const { player } = currentPiece[0]
        // var { moveOptions } = this.state
        var updateMoves = [...moveOptions]
        const upLeft = [-1,-1]
        const upRight = [1,-1]
        const downLeft = [-1,1]
        const downRight = [1,1]
        const moves = [upLeft,upRight,downLeft,downRight]
        moves.forEach(e => {
            var locatePiece = this.checkPieceLocations(x+e[0],y+e[1],updatedPieces)
            
            // --- check for adjacent pieces / is piece friend of foe? --- //
            // if(this.checkPieceLocations(e[0],e[1],updatedPieces) !== undefined && this.checkPieceLocations(e[0],e[1],updatedPieces).player !== player){
            if(locatePiece !== undefined && locatePiece.player !== player){
                
                // --- if it is a foe, is the next location over available? --- //
                var nextX = parseInt(e[0]) + locatePiece.x // potential jump to x
                var nextY = parseInt(e[1]) + locatePiece.y // potential jump to y
                var availMove = this.checkPieceLocations(nextX,nextY,updatedPieces) // are available "jump to" coordinates available

                if(availMove === undefined) {
                    
                    // -- is location on the board -- //
                    if(nextX >= 0 && nextX <= matrix.length-1){
                        if(nextY >= 0 && nextY <= matrix.length-1) {

                            // --- can move be made if isKing === false ? --- //
                            // --- "good" non-kings
                            if(player === "good" && nextY < currentPiece[0].y){
                                if(currentPiece[0].isKing === false){return}
                            }
                            
                            // --- "bad" non-kings
                            if(player === "bad" && nextY > currentPiece[0].y){
                                if(currentPiece[0].isKing === false){return}
                            }

                            // moveOptions.push([locatePiece.x,locatePiece.y])
                            updateMoves.push([locatePiece.x,locatePiece.y])

                            // --- this returns move options without making an attack --- //
                            // if(attack === false){return this.setState({moveOptions:moveOptions})}
                            if(attack === false){return this.setState({moveOptions:updateMoves})}

                            console.log('current',currentPiece[0].x,currentPiece[0].y)
                            this.setState({
                                moveOptions:moveOptions,
                                chainKillData:currentPiece,
                                // chainKillData:updatedPieces,
                                enemyX:locatePiece.x,
                                enemyY:locatePiece.y,
                                // chainKillData:obj,
                                chainKillAvailable:true
                            })
                            
                            this.switchPlayer(player)
                            return
                        }
                    }
                    
                }
                
            }
            return
        })
    }

    // --- if an attack is available: --- //
    highLightFate = () => {
        const { moveOptions,pieces,currentPlayer } = this.state
        // this.setState({moveOptions:[]})
        pieces.forEach(el => el.pendingDeath = false)
        // this.handleInput('moveOptions',[])
        // console.log('select',moveOptions)
        // this.checkForKill(this.state.enemyX,this.state.enemyY,this.state.chainKillData)
        var enemy = pieces.filter(el => el.player !== currentPlayer)
        var updatePieces = []
        var targetPieces = []
        const upLeft = [-1,-1]
        const upRight = [1,-1]
        const downLeft = [-1,1]
        const downRight = [1,1]
        // const moves = [upLeft,upRight,downLeft,downRight]
        
        enemy.forEach(el => {
            moveOptions.forEach(el2 => {
                // console.log(el.x,el2[0])
                if(el.x === el2[0] && el.y === el2[1]){
                    // console.log('here',el.id)}
                    targetPieces.push(pieces.findIndex(el3 => el3.id === el.id))}
            })
        })
        targetPieces.forEach(el  => {
            pieces[el].pendingDeath = true
        })
        this.handleInput("pieces",pieces)
    }

    setMoves = async (x,y,id,activeLocation,manualControl,currentPlayer,pieces,isKing,currentPiece) => { // gets all move options based on active location
        // --- kingAll() is for testing moves
        // this.kingAll()
        var pieceIndex = pieces.findIndex((el) => el.id === id)

        if(currentPlayer !== pieces[pieceIndex].player){
            return
        }

        // --- this checks all pieces on board for available locations/moves --- //
        for (let key in pieces){
            if(pieces[key].x === x && pieces[key].y === y){
                if(pieces[key].player !== currentPlayer){
                    return (
                        // if the chosen move already contains a piece, check if friend or foe
                        // res
                        // await this.checkForKill(pieces[key].x,pieces[key].y,activeLocation[0],activeLocation[1],id,activeLocation[2],currentPiece)
                        await this.checkForKill(pieces[key].x,pieces[key].y,currentPiece)
                    )} else {return}
            }
        }
        if(manualControl === true){return await this.executeMovePiece(x,y,activeLocation[1],id,currentPlayer,isKing)} else {return}

    }

    // --- makes actual movements --- //
    executeMovePiece = (x,y,activeLocation,id,currentPlayer,isKing) => {
        const { pieces,matrix } = this.state
        var updatePieces = [...pieces]
        var pieceIndex = pieces.findIndex((el) => el.id === id)

        // --- non-kings can only move one direction --- //
        if (activeLocation > y && currentPlayer === 'good'){
            if(isKing === false){
                return console.log('this move is not allowed')
            } 
        }
        if (activeLocation < y && currentPlayer === 'bad'){
            if(isKing === false){
                return console.log('this move is not allowed')
            } 
        }
        updatePieces[pieceIndex].x = x
        updatePieces[pieceIndex].y = y
        
        // --- becomes king --- //
        if(updatePieces[pieceIndex].player === 'bad' && updatePieces[pieceIndex].y === 0 ){
            updatePieces[pieceIndex].isKing = true
        } else if (updatePieces[pieceIndex].player === 'good' && updatePieces[pieceIndex].y === matrix.length-1) {
            updatePieces[pieceIndex].isKing = true
        } 

        this.setState({
            pieces:updatePieces,
            activeLocation:[null,null],
            tileIsSelected:1
        })

        //  --- testing auto moves - original code below this block --- //
        // this.chainKills(updatePieces[pieceIndex].x,updatePieces[pieceIndex].y,updatePieces,[updatePieces[pieceIndex]])

        // ---- original ---- //
        var sendInfo = {
            newPieces:updatePieces,
            currentPlayer:this.state.currentPlayer
        }
        this.sendToSocketsSwitch(sendInfo)
        // ----------------- //
    }

    // -- looks for and executes available attacks -- //
        checkForKill = async (enemyX,enemyY,currentPiece) => {
        const { pieces,matrix } = this.state
        const { player,isKing,id,x,y } = currentPiece[0]
        var currentX = x
        var currentY = y
        var pieceIndex = pieces.findIndex((el) => el.id === id)

        // -- LOWER LEFT ATTACK -- //
        if(currentX > enemyX && currentY < enemyY){
            // console.log('hit "checkForKill_1')

            // -- non-kings can only attack one direction on the y-axis -- //
            if(player === 'bad' && isKing === false){return}

            // -- check if location is available -- //
            if(await this.checkPieceLocations(enemyX-1,enemyY+1,null) === undefined) {

                // -- is location on the board? -- //
                if(enemyX-1 >= 0 && enemyY+1 <= matrix.length-1){

                    // -- update pieces -- //
                    var updatePieces = await this.killPiece(enemyX,enemyY,id)
                    var pieceIndex = updatePieces.findIndex((el) => el.id === id)
                    updatePieces[pieceIndex].x = enemyX-1
                    updatePieces[pieceIndex].y = enemyY+1

                    // -- piece becomes king if "good" AND at max-y location -- //
                    if (updatePieces[pieceIndex].player === 'good' && updatePieces[pieceIndex].y === matrix.length-1) {
                        updatePieces[pieceIndex].isKing = true
                    }
                    // --- reset currentPiece for chainKills() parameter --- //
                    var currentPiece = [updatePieces[pieceIndex]]
                    // -- make chain attack if available -- //
                    // this.chainKills(updatePieces[pieceIndex].x,updatePieces[pieceIndex].y,currentPlayer,updatePieces,currentPiece)
                    this.chainKills(updatePieces[pieceIndex].x,updatePieces[pieceIndex].y,updatePieces,currentPiece)
                    currentPiece[0].x = updatePieces[pieceIndex].x
                    currentPiece[0].y = updatePieces[pieceIndex].y

                    // -- update info -- //
                    this.setState({
                        pieces:updatePieces,
                        activeLocation:[null,null],
                        tileIsSelected:1,
                    })
    
                    // -- info sent to server -- //
                    var sendInfo = {
                        chainKillData:this.state.chainKillData,
                        newPieces:updatePieces,
                        currentPlayer:this.state.currentPlayer
                    }
                    // -- sends updates to server -- //
                    return await this.sendToSocketsSwitch(sendInfo)
                    
                }
            }

        // -- UPPER LEFT ATTACK -- //
        } else if (currentX > enemyX && currentY > enemyY) {
            // -- non-kings can only attack one direction on the y-axis -- //
            if(player === 'good' && isKing === false){return}

            // -- check if location is available -- //
            if( await this.checkPieceLocations(enemyX-1,enemyY-1,null) === undefined) {

                // -- is location on the board? -- //
                if(enemyX-1 >= 0 && enemyY-1 >= 0) {
                    // console.log('hit the function')
                    // -- update piece -- //
                    var updatePieces = await this.killPiece(enemyX,enemyY,id)
                    var pieceIndex = updatePieces.findIndex((el) => el.id === id)
                    updatePieces[pieceIndex].x = enemyX-1
                    updatePieces[pieceIndex].y = enemyY-1

                    // -- piece becomes king if "bad" AND at min-y location -- //
                    if(updatePieces[pieceIndex].player === 'bad' && updatePieces[pieceIndex].y === 0 ){
                        // console.log('king funtion')
                        updatePieces[pieceIndex].isKing = true
                    }
                    // --- reset currentPiece for chainKills() parameter --- //
                    var currentPiece = [updatePieces[pieceIndex]]
                    // -- make chain attack if available -- //
                    this.chainKills(updatePieces[pieceIndex].x,updatePieces[pieceIndex].y,updatePieces,currentPiece)
                    currentPiece[0].x = updatePieces[pieceIndex].x
                    currentPiece[0].y = updatePieces[pieceIndex].y
                    
                    // -- update info -- //
                    this.setState({
                        pieces:updatePieces,
                        activeLocation:[null,null],
                        tileIsSelected:1
                    })

                    // -- info sent to server -- //
                    var sendInfo = {
                        chainKillData:this.state.chainKillData,
                        newPieces:updatePieces,
                        currentPlayer:this.state.currentPlayer
                    }
                    // -- send updates to server -- //
                    return await this.sendToSocketsSwitch(sendInfo)
                }
                
            }

        // -- UPPER RIGHT ATTACK -- /
        } else if (currentX < enemyX && currentY > enemyY) {

            // -- non-kings can only attack one direction on the y-axis -- //
            if(player === 'good' && isKing === false){return}

            // -- check if location is available -- //
            if(await this.checkPieceLocations(enemyX+1,enemyY-1,null) === undefined) {
                
                // -- is location on the board? -- //
                if(enemyX+1 <= matrix.length-1 && enemyY-1 >= 0){

                    // -- update pieces -- //
                    var updatePieces = await this.killPiece(enemyX,enemyY,id)
                    var pieceIndex = updatePieces.findIndex((el) => el.id === id)
                    updatePieces[pieceIndex].x = enemyX+1
                    updatePieces[pieceIndex].y = enemyY-1

                    // -- piece becomes king if "bad" AND at min-y location -- //
                    if(updatePieces[pieceIndex].player === 'bad' && updatePieces[pieceIndex].y === 0 ){
                        updatePieces[pieceIndex].isKing = true
                    }
                    // --- reset currentPiece for chainKills() parameter --- //
                    var currentPiece = [updatePieces[pieceIndex]]
                    // await this.autoStartTurn(currentPlayer,updatePieces[pieceIndex],activeLocation,updatePieces)

                    // -- make chain attack if available -- //
                    this.chainKills(updatePieces[pieceIndex].x,updatePieces[pieceIndex].y,updatePieces,currentPiece)
                    currentPiece[0].x = updatePieces[pieceIndex].x
                    currentPiece[0].y = updatePieces[pieceIndex].y

                    // -- update info -- //
                    this.setState({
                        // pieces:updatePieces,
                        activeLocation:[null,null],
                        tileIsSelected:1
                    })

                    //  -- info sent to server -- //
                    var sendInfo = {
                        chainKillData:this.state.chainKillData,
                        newPieces:updatePieces,
                        currentPlayer:this.state.currentPlayer
                    }
                    // -- send info to server -- //
                    return await this.sendToSocketsSwitch(sendInfo)
                }
                
            }

        // -- LOWER RIGHT ATTACK -- //
        } else if (currentX < enemyX && currentY < enemyY) {
            // -- non-kings can only attack one direction on the y-axis -- //
            if(player === 'bad' && isKing === false){return}
            
            // -- check if location is available -- //
            if(await this.checkPieceLocations(enemyX+1,enemyY+1,null) === undefined) {
                // console.log('location on board?',enemyX+1,enemyY+1)
            
                // -- is location on the board? -- //
                if(enemyX+1 >= 0 && enemyY+1 <= matrix.length-1) {
                    var updatePieces = await this.killPiece(enemyX,enemyY,id)
                    var pieceIndex = updatePieces.findIndex((el) => el.id === id)
                    updatePieces[pieceIndex].x = enemyX+1
                    updatePieces[pieceIndex].y = enemyY+1

                    if (updatePieces[pieceIndex].player === 'good' && updatePieces[pieceIndex].y === matrix.length-1) {
                        
                        updatePieces[pieceIndex].isKing = true
                    }
                    // --- reset currentPiece for chainKills() parameter --- //
                    var currentPiece = [updatePieces[pieceIndex]]

                    // -- make chain attack if available -- //
                    this.chainKills(updatePieces[pieceIndex].x,updatePieces[pieceIndex].y,updatePieces,currentPiece)
                    currentPiece[0].x = updatePieces[pieceIndex].x
                    currentPiece[0].y = updatePieces[pieceIndex].y

                    this.setState({
                        pieces:updatePieces,
                        activeLocation:[null,null],
                        tileIsSelected:1
                    })
                    var sendInfo = {
                        chainKillData:this.state.chainKillData,
                        newPieces:updatePieces,
                        currentPlayer:this.state.currentPlayer
                    }
                    return await this.sendToSocketsSwitch(sendInfo)
                }

            }
        }
    }

    // --- attacks and removes piece from play --- //
    killPiece = async (enemyX,enemyY,id) => {
        const { pieces } = this.state
        var updatedPieces = [...pieces]
        var pieceIndex = pieces.findIndex((el) => el.id === id)
        var pieceId = await this.checkPieceLocations(enemyX,enemyY).id
        var killIndex = pieces.findIndex((el) => el.id === pieceId)
        updatedPieces.splice(killIndex,1)
        
        return updatedPieces
    }

    // -- checks location for availability -- //
    checkPieceLocations = (x,y,updatedPieces) => {
        const { pieces } = this.state

        // -- this is for chain kills -- //
        if(updatedPieces != null){
            for (let key in updatedPieces){
                if(updatedPieces[key].x === x && updatedPieces[key].y === y){
                    return updatedPieces[key]
                }
            }
            // -- this is for manual kills -- //
        } else {
            for (let key in pieces){
                if(pieces[key].x === x && pieces[key].y === y){
                    return pieces[key]
                }
            }
        }
        
    }

    switchPlayer = async (input) => {
        switch (input) {
            case 'good':
                this.setState({currentPlayer:'bad'})
                // this.autoStartTurn(this.state.currentPlayer,pieces) // for testing / pending removal
                break;
            case 'bad':
                this.setState({currentPlayer:'good'})
                // this.autoStartTurn(this.state.currentPlayer,pieces) // for testing / pending removal
        }
        return
    }

    selectTile = (x,y,piece) => {
        if(piece[0] != undefined) {
            // this.handleInput('activeLocation',[x,y,.2,piece])
            this.handleInput('activeLocation',[x,y,piece])
            this.handleInput('tileIsSelected',.4)
        }
        return
    }
    
    unselectTile = () => {
        this.handleInput('tileIsSelected',1)
        this.handleInput('activeLocation',[null,null])
    }

    handleInput = (prop,val) => {
        this.setState({[prop]:val})
        return
    }

    render() {

        const { matrix,pieces,activeLocation,currentPlayer,tileIsSelected,moveOptions,chainKillAvailable } = this.state

        const mappedMatrix = matrix.map((row,id) => {
            return row.map((col,id2) => {
                const currentPiece = pieces.filter(e => e.x === id2 && e.y === id)
                return <Tile key={[id2,id]} x={id2} y={id} color={(-1)**(id+id2)} selectTile={this.selectTile} unselectTile={this.unselectTile} setMoves={this.setMoves} currentPiece={currentPiece} currentPlayer={currentPlayer} activeLocation={activeLocation} tileIsSelected={tileIsSelected} pieces={pieces} moveOptions={moveOptions} chainKillAvailable={chainKillAvailable}/>
            })
        })

        return(<div>
            <div className='checker-table' ><span className='check-row-1' >{mappedMatrix} </span></div>
            <CurrentPlayer currentPlayer={currentPlayer} />

            {/*  --- test --- */}
            {/* <Notice info={currentPlayer}/>  */}
            {/*  --- test --- */}

        </div>)
    }
}

export default CheckerBoard