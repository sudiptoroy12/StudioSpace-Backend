import express from 'express'
import 'dotenv/config'
import cors from 'cors'


const app = express()

const PORT = 8000

app.use(cors())
app.use(express.json())


app.get('/', (req, res) => {
    res.send({message: "Server is running successfully!!"})
})

app.listen(PORT, () => {
    console.log(`Server is running at ${PORT}`);
    
})