import styles from "./ProfileStat.module.css"
import { Heart, User,  Users, Utensils } from 'lucide-react';
export default function ProfileStat(props: any){
    return(
        <div  
        className={styles.Container}
        style={{
            background: props.background,
            border: props.outline


        }}>
                <div className={styles.icon}>
                    {props.stat === "Followers" && <User/>}
                    {props.stat === "Following" && <Users/>}
                    {props.stat === "Recipes" && <Utensils/>}
                    {props.stat === "Likes" && <Heart/>}
                </div>
                    
                
                <h2>{props.statAmount}</h2>
                <p>{props.stat}</p>         
        </div>
    );
}