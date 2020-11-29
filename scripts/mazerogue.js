window.addEventListener("load", main) // Only start when all HTML loaded
window.addEventListener("keypress", handleKey)

var Key      = ""
var ShiftKey = false
var CtrlKey  = false
var AltKey   = false
function handleKey(Event) {
    Key      = Event.key
    ShiftKey = Event.shiftKey
    CtrlKey  = Event.ctrlKey
    AltKey   = Event.altKey
}

const BOARDW   = 1000
const BOARDH   = 1000
const WALLXY   = 10
const HALFWALL = WALLXY/2
var Canvas, Engine, Scene, Light, Camera, Ground, Player, MapCamera
var MObj // Maze Object
var StartTime
var   FollowCam=false // Initially do not follow
const FollowDist=70   // stay 10 units behind
const FollowH=40
var   Win=false       // Win condition

function main() {
    // Set up game engine
    Canvas = document.getElementById("cvGame")
    Engine = new BABYLON.Engine(Canvas)
    Scene  = new BABYLON.Scene(Engine)
    Light  = new BABYLON.HemisphericLight("Sun", new BABYLON.Vector3(0, 1,   0), Scene)

    // Set up a player camera & a map camera
    Camera    = new BABYLON.FreeCamera("Cam", new BABYLON.Vector3(0, 20, -60), Scene)
    // Camera = new BABYLON.ArcRotateCamera("Camera", -Math.PI / 2, Math.PI / 2, 100, BABYLON.Vector3.Zero());
    MapCamera = new BABYLON.FreeCamera("MapCam", new BABYLON.Vector3(0, 100, 0), Scene)
    // MapCamera.viewport = new BABYLON.Viewport(.75,.5,.25,.5)
    MapCamera.viewport = new BABYLON.Viewport(.67,.67,.33,.33)
    // MapCamera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA
    
    MapCamera.position.x = 0
    MapCamera.position.y = 1250 // 1200 //for entire board
    MapCamera.position.z = 0
    MapCamera.rotation.x = Math.PI/2.001
    MapCamera.rotation.z = .001
    MapCamera.rotation.y = .001
    // MapCamera.setTarget = new BABYLON.Vector3(0,0,0)

    Scene.activeCameras.push(Camera)
    Scene.activeCameras.push(MapCamera)
    Camera.attachControl(Canvas) // This attaches auto-input control

    // Add at least a ground
    Ground = BABYLON.MeshBuilder.CreateGround("Ground", {
                 width:BOARDW, height:BOARDH
             }, Scene)
    Ground.material=new BABYLON.StandardMaterial("GMat", Scene)
    Ground.material.emissiveColor=new BABYLON.Vector3(.25, .25, .25)
    Ground.material.disableLighting=true

    // Add a box for reference
    if (false) {
    var Box=BABYLON.MeshBuilder.CreateBox("Box", {width:10, height:10, depth:10}, Scene)
    Box.material = new BABYLON.StandardMaterial("BMat", Scene)
    Box.material.diffuseColor = new BABYLON.Vector3(1, 0, 0)
    Box.position.y=5
    }


    // Add the maze
    MObj=createMaze(20,20)
    draw3DMaze(MObj, Scene)

    // Add the hero to the entrace of the maze
    Player = new PolygonHero(MObj) // Replace later with RobotHero

    StartTime=Date.now()
    Engine.runRenderLoop(updateGame)
}

function updateGame() {
    if (!Win) {
        updateMazeRogue()
        dvMidText.innerHTML="MAZE ROGUE"
    } else dvMidText.innerHTML="YOU WIN"

    Scene.render()
}

/*
 *
 * updateMazeRogue: The main update routine
 *
 */
function updateMazeRogue() {
    Player.move()
    if (Player.row==MObj.ExitRC[0] && Player.col==MObj.ExitRC[1]) Win=true
    // Move the camera to behind the player
    if (FollowCam) {
        var NewAng=(Player.Mesh.rotation.y)+Math.PI // face opposite player
        var CamX=Math.cos(NewAng)*FollowDist
        var CamZ=Math.sin(NewAng)*FollowDist
        Camera.position.x=CamX+Player.Mesh.position.x
        Camera.position.z=Player.Mesh.position.z-CamZ
        Camera.position.y=FollowH
        Camera.rotation.y=Player.Mesh.rotation.y+Math.PI/2
        Camera.setTarget(Player.Mesh.position)
        MapCamera.setTarget=Player.Mesh.position
        // MapCamera.position.x=Player.Mesh.position.x
        // MapCamera.position.z=Player.Mesh.position.z
    }
    var TimeTaken=(Date.now()-StartTime)/1000
    TimeTaken=TimeTaken.toFixed(1)
    dvLeftText.innerHTML="Time: "+TimeTaken+" secs"
}
/*
 * Hero: A basic polygon hero substitute for what will ultimately be a robot
 */
function PolygonHero (MazeObj) {
    const hh=WALLXY-1 // Hero height, less than Wall  Height
    // Add a marker (for now) at the starting row,column
    this.Mesh = BABYLON.MeshBuilder.CreateCylinder("Hero", { 
                    tessellation:4, height:hh, width:hh, diameterBottom:hh/1.5, diameterTop: 0 
                }, Scene)
    this.Mesh.material = new BABYLON.StandardMaterial("HeroMat", Scene)
    this.Mesh.material.diffuseColor = new BABYLON.Color3(1.0, 0.75, 0.0)
    this.Mesh.position.y=hh/2
    this.Mesh.rotation.z=-Math.PI/2 
    let w=MazeObj.Width
    let h=MazeObj.Height
    let r=MazeObj.EntryRC[0]
    let c=MazeObj.EntryRC[1]
    this.CellW=BOARDW/MazeObj.Width  // Calc Cell Width in Pixels
    this.CellH=BOARDH/MazeObj.Height // Calc Cell Height in Pixels

    // Calculate the starting x and y positions, transformed for xz coordinates
    let sx = c*this.CellW            // Calculate upper-right cornder
    let sz = r*this.CellH
    sx = -(BOARDW/2)+sx+this.CellW/2 // Adjust for board and center in cell
    sz =  (BOARDH/2)-sz-this.CellH/2 

    this.Mesh.position.x= sx
    this.Mesh.position.z= sz
    
    this.MazeObj = MazeObj
    // local orientation    
    this.rot = 0 // in degrees
    this.row = r // row
    this.col = c // col

    this.move=function() {
        const key = Key
        var drow=0, dcol=0, RadAng
        switch (key) {
            case 'a': 
                this.rot-=90
                if (this.rot<0) this.rot+=360
                this.rot %= 360 
            break
            case 'd': 
                this.rot+=90
                this.rot %= 360 
            break
            case 'w':
                RadAng = this.rot*Math.PI/180 
                dcol=Math.round(Math.cos(RadAng)) // force -1,0,1
                drow=Math.round(Math.sin(RadAng)) // force -1,0,1
            break
            case 's':
                RadAng=(this.rot+180)*Math.PI/180
                dcol=Math.round(Math.cos(RadAng)) // force -1,0,1
                drow=Math.round(Math.sin(RadAng)) // force -1,0,1
            break
            case 'f':
                FollowCam=!FollowCam
            break
        }
        Key="" // reset Key
        
        // Rotate player
        RadAng = this.rot*Math.PI/180 
        this.Mesh.rotation.y=RadAng

        // Move if not across wall
        if (dcol!=0 || drow!=0) {
            var CurrCell = MazeObj.Maze[this.row][this.col]
            if (dcol>0 && (CurrCell & 0b0010)) return
            if (dcol<0 && (CurrCell & 0b0100)) return
            if (drow>0 && (CurrCell & 0b0001)) return
            if (drow<0 && (CurrCell & 0b1000)) return
            // Add a Yellow Dot at the old position

            var GName = "G_"+this.row+"_"+this.col
            var GMesh = Scene.getMeshByName(GName)
            if (GMesh==null) {
                var Gr = BABYLON.MeshBuilder.CreateGround(GName, {
                         width:this.CellW/4, height:this.CellH/4
                       }, Scene)
                Gr.material=new BABYLON.StandardMaterial("M_" + GName, Scene)
                Gr.material.emissiveColor=new BABYLON.Vector3(.50, .50, .25)
                Gr.material.disableLighting=true
                Gr.position.x = this.Mesh.position.x
                Gr.position.y = 1
                Gr.position.z = this.Mesh.position.z
            } else console.log("Already visited: "+GName)
            this.Mesh.position.x+=(dcol*this.CellW)
            this.Mesh.position.z-=(drow*this.CellH)    
            this.row+=drow
            this.col+=dcol
        }
    }

    return this
}

function draw3DMaze(MazeObj, Scene) {
let BoardW, BoardH
let Maze, MazeCols, MazeRows
let CellW, CellH
let StartX, StartY, X, Y

    Maze=MazeObj.Maze
//  drawMaze(Maze)  // Debug to console
//  Calculate the size of a maze cell
    BoardW=BOARDW           // in pixels
    BoardH=BOARDH
    MazeCols=MazeObj.Width  // in cells
    MazeRows=MazeObj.Height

    CellW = BoardW/MazeCols // Width & Height of a cell in pixels
    CellH = BoardH/MazeRows 

//  Calculate the upper-left corner to start drawing the maze
    StartX = -BoardW/2
    StartY =  BoardH/2

//  Loop through and draw walls
    for (var Row=0; Row<MazeObj.Width; Row++) {
        Y = Row * CellH // upper left corner to start drawing cell
        for (var Col=0; Col<MazeObj.Height; Col++) {
            X = Col * CellW // upper left corner to start drawing cell
            Cell=Maze[Row][Col]
            x=X+StartX
            y=StartY-Y
            if (Row==0) // Only draw the 1st top-wall (due to bottom redundancy)
            if (Cell & 0b1000) drawWall("H",x      ,y      ,CellW,CellH,Scene)
            if (Cell & 0b0001) drawWall("H",x      ,y-CellH,CellW,CellH,Scene)
            if (Col==0) // Only draw the 1st left-wall (due to right redundancy)
            if (Cell & 0b0100) drawWall("V",x      ,y      ,CellW,CellH,Scene)
            if (Cell & 0b0010) drawWall("V",x+CellW,y      ,CellW,CellH,Scene)
        }
    }
}

/*
 * drawHWall: Draw a horizontal wall
 */
function drawWall(WallType, X, Y, CellW, CellH, Scene) {
    let PlaneName="WALL"+"_"+X+"_"+Y+"_"+WallType
    let Plane
    let bFlatWall=false
    if (bFlatWall) { // Flat walls are faster, but top cam doesn't display well
        Plane = BABYLON.MeshBuilder.CreatePlane(PlaneName, {
        height:WALLXY, width: CellW, 
        sideOrientation: BABYLON.Mesh.DOUBLESIDE}, Scene);
    } else {
        const WallDepth=1.5 // for top-camera to work
        Plane = BABYLON.MeshBuilder.CreateBox(PlaneName, {
        height:WALLXY, width: CellW, depth:WallDepth,
        sideOrientation: BABYLON.Mesh.DOUBLESIDE}, Scene);
    }
    Plane.material = new BABYLON.StandardMaterial("g_"+PlaneName, Scene)
    Plane.material.emissiveColor=new BABYLON.Color3(.5,.5,.5)
    Plane.material.disableLighting=true

    Plane.position.y=HALFWALL // Pop up
    if (WallType=="H") {
        Plane.position.x=X+CellW/2
        Plane.position.z=Y
    } else if (WallType=="V") {
        Plane.position.x=X
        Plane.position.z=Y-CellH/2
        Plane.rotation.y=Math.PI/2
    }
}

