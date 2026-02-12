import styles from "./ProfileCard.module.css"
import ProfileStat from "../ProfileStat/ProfileStat";
//finish profile card design
export default function ProfileCard(props: any){
    return(
        <div className={styles.profileWindow}>
            <div className={styles.statsBox}>
                  <ProfileStat
                    stat="Followers"
                    statAmount="5000"
                    background= "#D9F5FF"
                    outline="1px solid #6ED1E0"
                  />
                  <ProfileStat
                    stat="Following"
                    statAmount="50"
                    background="#D9F5FF"
                    outline="1px solid #6ED1E0"
                  />
                  <ProfileStat
                    stat="Recipes"
                    statAmount="50"
                    background="#D9F5FF"
                    outline="1px solid #6ED1E0"
                  />
                  <ProfileStat
                    stat="Likes"
                    statAmount="50"
                    background="#D9F5FF"
                    outline="1px solid #6ED1E0"
                  />
                </div>
        </div>
    );
}