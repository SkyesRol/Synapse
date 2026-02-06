import { useParams } from "react-router-dom";



function Conversations() {
    let params = useParams();
    let id = params.conversationId;
    return (
        <>
            Conversations Page:{id}
        </>
    )


}

export default Conversations;